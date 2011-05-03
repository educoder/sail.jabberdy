if (!console)
    var console = { log: function () {} }

Jabberdy = {
    rollcallURL: 'http://rollcall.proto.encorelab.org',
    xmppDomain: 'proto.encorelab.org',
    groupchatRoom: 's3@conference.proto.encorelab.org',
    
    ui: Sail.UI,
    groupchat: null,
    session: null,
    
    init: function() {
        Jabberdy.setupUI()
        
        $('#connecting').show()
   
        Jabberdy.authenticate(Jabberdy.join)
    },
    
    authenticate: function(onSuccess) {
        Jabberdy.rollcall = new Sail.Rollcall.Client(Jabberdy.rollcallURL)
        Jabberdy.token = Jabberdy.rollcall.getCurrentToken()

        if (!Jabberdy.token) {
          Jabberdy.rollcall.redirectToLogin()
          return
        }
        
        Jabberdy.rollcall.fetchSessionForToken(Jabberdy.token, function(data) {
            Jabberdy.session = data.session
            onSuccess()
        })
    },
    
    join: function() {
        session = Jabberdy.session
        console.log("Authenticated as: ", session.user.username, session.user.encrypted_password)
        
        $('#username').text(session.user.username)
        
        Sail.Strophe.bosh_url = '/http-bind/'
     	Sail.Strophe.jid = session.user.username + '@' + Jabberdy.xmppDomain
      	Sail.Strophe.password = session.user.encrypted_password
      	
      	Sail.Strophe.onConnectSuccess = function() {
      	    Jabberdy.groupchat = Sail.Strophe.joinGroupchat(Jabberdy.groupchatRoom)
      	    Jabberdy.groupchat.addHandler(Jabberdy.handleGroupchatMessage)
      	    
      	    $('#connecting').hide()
      	    Jabberdy.chooseWatchOrPlay()
      	}
      	
      	Sail.Strophe.connect()
    },
    
    chooseWatchOrPlay: function() {
        Jabberdy.ui.showDialog('#join')
    },
    
    setupUI: function() {
        console.log("Jabberdy: setting up UI...")
        
        $('#play').click(function() {
            $('#guess-panel').show('slide', 
                { easing: 'easeOutBounce',  direction: 'down'}, 
                'slow',
                function() {$('#guess').focus()}
            )
        })
        
        $('#guess-form').submit(function() {Jabberdy.submitGuess(); return false})
    },
    
    submitGuess: function() {
        guess = $('#guess').val()
        ev = new Sail.Event('guess', guess)
        Jabberdy.groupchat.sendEvent(ev)
        $('#guess').attr('disabled', true)
    },
    
    handleGroupchatMessage: function(msg) {
        console.log(msg)
    }
}

$(document).ready(Jabberdy.init)