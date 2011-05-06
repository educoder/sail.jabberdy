require 'rubygems'

require 'pidly'
require 'dictionary'
require 'referee'

require 'ruby-debug'

module Jabberdy
  class Agents < Pidly::Control
    
    before_start do
      @dictionary = Dictionary.new
      @referee = Referee.new
      @dictionary.prep
      @referee.prep
      
      @dictionary.debug = false
      @referee.debug = false
    end
    
    start do
      trap(:INT) { @referee.stop; @dictionary.stop; EM.stop }
      trap(:TERM) { @referee.stop; @dictionary.stop; EM.stop }
      EM.run do
        @dictionary.run
        @referee.run
      end
    end
    
    stop do
      EM.stop_event_loop
    end
    
  end
end

@daemon = Jabberdy::Agents.spawn(
  :name => "jabberdy_agents",
  :path => '.',
  :verbose => true
)

@daemon.start