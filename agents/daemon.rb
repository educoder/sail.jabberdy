$: << "sail.rb/lib"
require 'sail/daemon'

require 'dictionary'
require 'referee'

@daemon = Sail::Daemon.spawn(
  :name => "jabberdy",
  :path => '.',
  :verbose => true
)

@daemon << Dictionary.new(:password => "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3")
@daemon << Referee.new(:password => "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3")

@daemon.start