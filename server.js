global.boshServer = 'proto.encorelab.org'
global.boshPort = 5280

var sail = require('./js/sail.js/sail.node.server.js')

sail.server.listen(8000)
