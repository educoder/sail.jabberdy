require 'rubygems'
require 'blather/client'
require 'json'
require 'nokogiri'
require 'rest_client'
require 'uri'

# CONFIGURATION


name = 'dictionary'
password = "encore"
chatroom = "s3@conference.proto.encorelab.org"

# connect as component
setup(name, password, "proto.encorelab.org", 5275)

# LOGIC

when_ready do
  puts "Joining room..."
  pres = Blather::Stanza::Presence::Status.new
  pres.to = chatroom+"/"+name
  pres.state = :chat
  
  client.write(pres)
  setword("what")
end

message :groupchat?, :body do |m|
  if m.from == chatroom+"/"+jid
    puts "got message from myself"
  else
    begin
      msg = Nokogiri::XML.parse(m.body)
      if msg['event'] == 'setword'
        word = msg['content']
        setword(word)
      elsif msg['event']
        puts "ignoring event #{msg['event']}"
      else
        puts "ignoring non-event message: #{m.body}"
      end
    rescue => e
      puts "error while parsing message: #{e} --> #{m.body}"
    end
  end
end


#### helpers

def setword(word)
  dfn = fetch_definition_for_word(word)

  if dfn == :too_long
    puts err = "word #{word.inspect} is too long"
  elsif dfn == :no_definition
    puts err = "no definitions found for #{word.inspect}"
  else
    out = {'type' => 'definition', 'content' => dfn}
    puts "Definition is: #{dfn}"
  end
  
  if err
    out = {'type' => 'error', 'content' => err}
  end

  m2 = Blather::Stanza::Message.new

  m2.to = "s3@conference.proto.encorelab.org"
  m2.body = out.to_json
  m2.type = "groupchat"

  client.write(m2)
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
    return dfn['primaries'].first['entries'].find{|ent| ent['type'] == 'meaning'}['terms'].first['text']
  else
    return :no_definition
  end
end