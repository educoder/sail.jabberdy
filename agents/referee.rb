$: << 'sail.rb/lib'
require 'sail/agent'

class Referee < Sail::Agent
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
      @current_word = word
    end
    
    event :guess? do |stanza, ev|
      word = ev['word']
      puts "checking asnwer #{word.inspect}"
      if word == @current_word
        puts "#{word.inspect} from #{stanza.from.inspect} is right!"
        event! :win, {:word => word, :winner => stanza.from}
      else
        puts "#{word.inspect} from #{stanza.from.inspect} is wrong"
        event! :wrong, {:word => word}, :to => stanza.from
      end
    end
    
    disconnected do
      # automatically reconnect
      client.connect
    end
  end
  
  
  protected
  
  def set_word(word)
    dfn = fetch_definition_for_word(word)

    if dfn == :too_long
      puts err = "word #{word.inspect} is too long"
    elsif dfn == :no_definition
      puts err = "no definitions found for #{word.inspect}"
    else
      puts "Definition is: #{dfn}"
      event! :set_definition, dfn
    end

    if err
      event! :error, err
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

    puts "Got #{dfn['primaries'].size} definitions for #{word.inspect}"

    if dfn['primaries']
      candidates = dfn['primaries'].first['entries'].find{|ent| ent['type'] == 'meaning'}['terms']
      # use the first definition that doesn't include the word
      return candidates.find{|term| !term['text'].include?(word)}['text']
    else
      return :no_definition
    end
  end
end
