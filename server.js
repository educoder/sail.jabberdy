// Super-simple stand-alone HTTP server with built-in reverse
// proxy for XMPP-BOSH.
//
// This uses node.js with the http-proxy and node-static modules.
//
// 

var http = require('http')
var httpProxy = require('http-proxy')
var httpStatic = require('node-static')
var url = require('url')
var util = require('util')

var proxy = new httpProxy.HttpProxy()
var file = new(httpStatic.Server)('.', {cache: false})

var server = http.createServer(function (req, res) {
    if (url.parse(req.url).pathname.match(/^\/http-bind/)) {
        console.log("PROXY "+req.url)
        proxy.proxyRequest(req, res, {
            host: 'proto.encorelab.org',
            port: 5280
        })
    }
    
    req.addListener('end', function(){ 
        if (!url.parse(req.url).pathname.match(/^\/http-bind/)) {
            console.log("STATIC "+req.url)
            file.serve(req, res)
        }        
    })
})

server.listen(8000)
