require 'rubygems'
require 'blather/client'
require 'json'
require 'rest_client'
require 'uri'

# CONFIGURATION

jid = 'scoring_agent@proto.encorelab.org'
password = "scoring_agent"
chatroom = "s3@conference.proto.encorelab.org"

setup(jid, password)

@current_word = nil

# LOGIC

when_ready do
  puts "Joining room..."
  pres = Blather::Stanza::Presence::Status.new
  pres.to = chatroom+"/"+jid
  pres.state = :chat
  
  client.write(pres)
end

message :groupchat?, :body do |m|
  if m.from == chatroom+"/"+jid
    puts "got message from myself"
  else
    begin
      msg = JSON.parse(m.body)
      if msg['type'] == 'setword'
        word = msg['content']
        @current_word = word
      elsif msg['type'] == 'answer'
        answer = msg['content']
        puts "checking asnwer #{answer.inspect}"
        if answer == @current_word
          puts "#{answer.inspect} from #{m.from.inspect} is right!"
          endgame(m.from)
        else
          puts "#{answer.inspect} from #{m.from.inspect} is wrong"
        end
      end
    rescue JSON::ParserError
      puts "ignoring non-JSON message"
    end
  end
end


#### helpers

def endgame(winner)
  data = {
    'type' => 'endgame',
    'answer' => @current_word,
    'winner' => winner
  }
  
  m = Blather::Stanza::Message.new
  m.to = "s3@conference.proto.encorelab.org"
  m.body = data.to_json
  m.type = "groupchat"
  
  client.write(m)
end