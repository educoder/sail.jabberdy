require 'sail/agent'

class Pong < Sail::Agent
  def prep
    setup my_jid, password, server, port
  
    when_ready do
      pres = Blather::Stanza::Presence::Status.new
      pres.to = my_jid_in_room
      pres.state = :chat

      puts "Joining #{my_jid_in_room.inspect}..."

      client.write(pres)
    end
  
    message :groupchat?, :body do |stanza|
      puts stanza.inspect
      unless stanza.from == my_jid_in_room
        event! 'pong', stanza.body
      end
    end
  end
end

