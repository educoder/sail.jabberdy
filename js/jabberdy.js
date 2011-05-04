if (!window.console)
    window.console = { log: function () {} }

Jabberdy = {
    rollcallURL: 'http://rollcall.proto.encorelab.org',
    xmppDomain: 'proto.encorelab.org',
    groupchatRoom: 's3@conference.proto.encorelab.org',
    
    ui: Sail.UI,
    groupchat: null,
    session: null,
    justWatching: false,
    
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
      	    Sail.Strophe.addHandler(Jabberdy.handleSailEvent, null, null, 'chat')
      	    
      	    Jabberdy.groupchat = Sail.Strophe.joinGroupchat(Jabberdy.groupchatRoom)
      	    Jabberdy.groupchat.addHandler(Jabberdy.handleSailEvent)
      	    
      	    $('#connecting').hide()
      	    Jabberdy.chooseWatchOrPlay()
      	}
      	
      	Sail.Strophe.connect()
    },
    
    chooseWatchOrPlay: function() {
        Jabberdy.ui.showDialog('#join-dialog')
    },
    
    askForNewWord: function() {
        Jabberdy.ui.showDialog('#set-word-panel')
    },
    
    setupUI: function() {
        console.log("Jabberdy: setting up UI...")
        
        $('#play').click(Jabberdy.askForNewWord)
        $('#watch').click(function() { Jabberdy.justWatching = true })
        
        $('#guess-form').submit(function() {Jabberdy.submitGuess(); return false})
        
        $('#set-word-form').submit(function () {Jabberdy.setNewWord(); return false})
    },
    
    askForNewWord: function() {
        $('#set-word').attr('disabled', false)
        $('#guess-panel').hide()
        $('#set-word-panel').show('puff',
            { easing: 'swing' },
            'slow',
            function() {$('#set-word').val('').focus()})
    },
    
    submitGuess: function() {
        word = $('#guess').val()
        ev = new Sail.Event('guess', {word: word})
        Jabberdy.groupchat.sendEvent(ev)
        //$('#guess').attr('disabled', true)
    },
    
    setNewWord: function() {
        word = $('#set-word').val()
        ev = new Sail.Event('set_word', {word: word})
        Jabberdy.groupchat.sendEvent(ev)
        $('#set-word').attr('disabled', true)
        $('#winner').hide()
    },
    
    switchToGuessingMode: function() {
        $('.guess-baloon').remove()
        $('#set-word-panel').hide()
        $('#winner').hide()
        $('#definition').show()
        
        $('#guess').attr('disabled', false) // just in case...
        
        if (!Jabberdy.justWatching && !$('#guess-panel').is(':visible')) {
            $('#guess-panel').show('slide', 
                { easing: 'easeOutBounce',  direction: 'down'}, 
                'slow',
                function() {$('#guess').val('').focus()}
            )
        }
    },
    
    setDefinition: function(definition) {
        $('#definition').text(definition)
        Jabberdy.switchToGuessingMode()
    },
    
    wrongGuess: function(definition) {
        $('#guess-container').effect('shake', {duration: 50, distance: 5}, function() {
            $('#guess').val('').attr('disabled', false).focus()
        })
    },
    
    badWord: function(message) {
        alert(message)
        $('#set-word').val('').attr('disabled', false).focus()
    },
    
    showGuess: function(from, word) {
        player = from.split('/')[1].split('@')[0]
        baloon = $("<div class='guess-baloon'><div class='word'>"+word+"</div><div class='player'>"+player+"</div></div>")
        field_height = $("#field").height()
        field_width = $("#field").width()
        baloon.css('left', (Math.random() * (field_width - 100) + 'px'))
        baloon.css('top', (Math.random() * (field_height - 100) + 'px'))
        $("#field").append(baloon)
    },
    
    announceWinner: function(ev) {
        $('.guess-baloon').remove()
        winner = ev.winner.split('/')[1].split('@')[0]
        $('#guess-panel').hide('slide',
                    {easing: 'swing', direction: 'down'},
                    'fast')
        $('#definition').hide('puff', 'fast')
        $('#winner-username').text(winner)
        $('#winner').show()//'drop', {easing: 'easyOutBounce'}, 'fast')
        if (ev.winner == Jabberdy.groupchat.jid()) {
            Jabberdy.askForNewWord()
        }
    },
    
    handleSailEvent: function(stanza) {
        msg = $(stanza)
        
        body = $(msg).children('body').text()
        ev = null
        try {
            ev = JSON.parse(body)
        } catch(err) {
            console.log("couldn't parse message, ignoring: "+err)
            return
        }
        
        if (msg.attr('from') == Jabberdy.groupchat.jid() && ev.type != 'guess') {
            console.log("got message from myself... ignoring", msg)
            return
        }
        
        
        switch(ev.type) {
            case 'guess':
                Jabberdy.showGuess(msg.attr('from'), ev.word)
                break
            case 'set_definition':
                Jabberdy.setDefinition(ev.definition)
                break
            case 'wrong':
                Jabberdy.wrongGuess()
                break
            case 'bad_word':
                Jabberdy.badWord(ev.message)
                break
            case 'win':
                Jabberdy.announceWinner(ev)
                break
            default:
                console.log("UNHANDLED EVENT "+ev.type, ev)
        }
        
        return true
    }
    
    
}

$(document).ready(Jabberdy.init)