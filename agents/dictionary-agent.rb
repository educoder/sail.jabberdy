require 'rubygems'
require 'blather/clienti/dsl'
require 'json'
#require 'nokogiri'
require 'xmlsimple'
require 'rest_client'
require 'uri'

# CONFIGURATION


@nick = 'dictionary'
@password = "encore"
@channel = "s3@conference.proto.encorelab.org"
@groupchat_jid = @channel + "/" + @nick

# connect as component
setup(@nick, @password, "proto.encorelab.org", 5275)

# LOGIC

when_ready do

  pres = Blather::Stanza::Presence::Status.new
  pres.to = @groupchat_jid
  pres.state = :chat
  
  puts "Joining room #{@groupchat_jid.inspect}..."

  client.write(pres)
  set_word("golem")
end

message :groupchat?, :body do |m|
  if m.from == @groupchat_jid
    puts "got message from myself"
  else
    begin
      msg = XmlSimple.xml_in(m.body)
      if msg['type'] == 'set-word'
        word = msg['content']
        set_word(word)
      elsif msg['type']
        puts "ignoring event #{msg['type']}"
      else
        puts "ignoring non-event message: #{m.body}"
      end
    rescue => e
      puts "error while parsing message: #{e} --> #{m.body}"
    end
  end
end

presence do |p|
  puts p.inspect
end

iq do |q|
  puts q.inspect
end


#### helpers

def set_word(word)
  dfn = fetch_definition_for_word(word)

  if dfn == :too_long
    puts err = "word #{word.inspect} is too long"
  elsif dfn == :no_definition
    puts err = "no definitions found for #{word.inspect}"
  else
    ev = sail_event('new-definition', dfn)
    puts "Definition is: #{dfn}"
  end
  
  if err
    ev = sail_event('error', err)
  end

  client.write(ev)
end

def fetch_definition_for_word(word)
  if word.length > 20
    return :too_long
  end
  
  puts "Looking up #{word.inspect}..."
  
  dfn_json = RestClient.get "http://www.google.com/dictionary/json?callback=dict_api.callbacks.id100&q=#{URI.escape(word)}&sl=en&tl=en"
  dfn_json.gsub!('dict_api.callbacks.id100(','')
  dfn_json.gsub!(',200,null)','')
  dfn = JSON.parse(dfn_json)
  
  puts "Got #{dfn['primaries'].size} definitions for #{word.inspect}"
  
  if dfn['primaries']
    candidates = dfn['primaries'].first['entries'].find{|ent| ent['type'] == 'meaning'}['terms']
    # use the first definition that doesn't include the word
    return candidates.find{|term| !term['text'].include?(word)}['text']
  else
    return :no_definition
  end
end


def sail_event(type, content, format)
  h = {'type' => type, 'content' => content}
  xml = XmlSimple.xml_out(h, :RootName => 'event')

  msg = Blather::Stanza::Message.new
  msg.to = @channel
  msg.type = :groupchat
  msg.body = xml

  return msg
end
