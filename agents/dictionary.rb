require 'rubygems'
require 'blather/client/dsl'
require 'json'
#require 'nokogiri'
require 'json'
require 'rest_client'
require 'uri'

$: << 'sail.rb/lib'
require 'sail/agent'


class Dictionary < Sail::Agent
  def prep
    setup my_jid, password, server, port
  
    when_ready do
      pres = Blather::Stanza::Presence::Status.new
      pres.to = my_jid_in_room
      pres.state = :chat

      puts "Joining #{my_jid_in_room.inspect}..."

      client.write(pres)
    end
  
    event :set_word? do |stanza, ev|
      word = ev['word']
      set_word(word, stanza.from)
    end
    
    message :error? do |err|
      puts "\n\n\n"
      puts "!" * 80
      puts "GOT ERROR MESSAGE: #{err.inspect}"
      puts "!" * 80
    end
    
    disconnected do
      # automatically reconnect
      puts "DISCONNECTED!"
      puts "attempting to reconnect..."
      client.connect
    end
  end
  
  
  protected
  
  def set_word(word, by)
    dfn = fetch_definition_for_word(word)

    if dfn == :too_long
      puts "word #{word.inspect} is too long"
      event! :bad_word, {:message => "The word you picked is too long."}, :to => by
    elsif dfn == :no_definition
      puts "no definitions found for #{word.inspect}"
      event! :bad_word, {:message => "No definitions found for #{word.inspect}."}, :to => by
    else
      puts "Definition is: #{dfn}"
      event! :set_definition, {:definition => dfn}
    end
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
    
    if dfn['primaries']
      puts "Got #{dfn['primaries'].size} definitions for #{word.inspect}"
      candidates = dfn['primaries'].first['entries'].find{|ent| ent['type'] == 'meaning'}['terms']
      # use the first definition that doesn't include the word
      candidates = candidates.find{|term| !term['text'].include?(word)}
      if candidates && candidates['text']
        return candidates['text']
      else
        return :no_definition
      end
    else
      return :no_definition
    end
  end
end
