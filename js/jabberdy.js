Jabberdy = {
    // config
    
    rollcallURL: 'http://rollcall.proto.encorelab.org',
    xmppDomain: 'proto.encorelab.org',
    groupchatRoom: 's3@conference.proto.encorelab.org',
    
    
    // private global vars
    
    ui: Sail.UI,
    groupchat: null,
    session: null,
    justWatching: false,
    
    
    // initialization (called in $(document).ready() at the bottom of this file)
    
    init: function() {
        console.log("Initializing Jabberdy...")
        
        Sail.modules
            .load('Rollcall.Authenticator', {mode: 'picker'})
            .load('Strophe.AutoConnector')
            .load('AuthStatusWidget')
            .thenRun(function () {
                Sail.autobindEvents(Jabberdy, {
                    pre: function() {console.debug(arguments[0].type+'!',arguments)}
                })
                
                $('#connecting').show()
                
                $(Sail.app).trigger('initialized')
                return true
            })
        
        
        $('#play').click(function() {$(Jabberdy).trigger('choseToPlay')})
        $('#watch').click(function() {$(Jabberdy).trigger('choseToWatch')})
        
        $('#guess-form').submit(function() {Jabberdy.submitGuess(); return false})
        
        $('#set-word-form').submit(function () {Jabberdy.setNewWord(); return false})
    },
    
    askForNewWord: function() {
        $(Jabberdy).trigger('enteringNewWord')
        Jabberdy.ui.showDialog('#set-word-panel')
        
        $('#set-word').attr('disabled', false)
        $('#guess-panel').hide()
        $('#set-word-panel').show('puff',
            { easing: 'swing' },
            'slow',
            function() { $('#set-word').val('').focus() }
        )
    },
    
    switchToGuessingMode: function() {
        $('.guess-baloon').remove()
        Jabberdy.ui.dismissDialog('#set-word-panel')
        $('#winner').hide()
        $('#definition').show()
        $('#guess').removeClass('in-progress')
        
        $('#guess').attr('disabled', false) // just in case...
        
        if (!Jabberdy.justWatching && !$('#guess-panel').is(':visible')) {
            $('#guess-panel').show('slide', 
                { easing: 'easeOutBounce',  direction: 'down'}, 
                'slow',
                function() {$('#guess').val('').focus()}
            )
        }
    },
    
    submitGuess: function() {
        $('#guess').addClass('in-progress')
        word = $('#guess').val()
        sev = new Sail.Event('guess', {word: word})
        Jabberdy.groupchat.sendEvent(sev)
        $(Jabberdy).trigger('submittedGuess')
    },
    
    setNewWord: function() {
        $('#set-word').addClass('in-progress')
        word = $('#set-word').val()
        sev = new Sail.Event('set_word', {word: word})
        Jabberdy.groupchat.sendEvent(sev)
        $(Jabberdy).trigger('submittedNewWord')
    },
    
    
    events: {
        // mapping of Sail events to local Javascript events
        sail: {
            guess: function(sev) {
                word = sev.payload.word
                player = sev.from.split('/')[1].split('@')[0]
                baloon = $("<div class='guess-baloon'><div class='word'>"+word+"</div><div class='player'>"+player+"</div></div>")
                baloon.hide()
                field_height = $("#field").height()
                field_width = $("#field").width()
                baloon.css('left', (Math.random() * (field_width - 100) + 'px'))
                baloon.css('top', (Math.random() * (field_height - 100) + 'px'))
                $("#field").append(baloon)
                baloon.show('puff', 'fast')
                baloon.draggable()
            },
            
            set_definition: function(sev) {
                definition = sev.payload.definition
                $('#set-word').removeClass('in-progress')
                $('#definition').text(definition)
                Jabberdy.switchToGuessingMode()
            },
            
            wrong: function(sev) {
                definition = sev.payload.definition
                $('#guess').removeClass('in-progress')
                $('#guess-container').effect('shake', {duration: 50, distance: 5}, function() {
                    $('#guess').val('').attr('disabled', false).focus()
                })
            },
            
            bad_word: function(sev) {
                message = sev.payload.message
                $('#set-word').removeClass('in-progress')
                alert(message)
                $('#set-word').val('').attr('disabled', false).focus()
            },
            
            win: function(sev) {
                winner = sev.payload.winner.split('/')[1].split('@')[0]
                word = sev.payload.word
                $('.guess-baloon').remove()
                $('#guess-panel').hide('slide',
                            {easing: 'swing', direction: 'down'},
                            'fast')
                $('#definition').hide('puff', 'fast')
                $('#winning-word').text(word)
                $('#winner-username').text(winner)
                $('#winner').show('pulsate', 'normal')//'drop', {easing: 'easyOutBounce'}, 'fast')
                if (sev.payload.winner == Jabberdy.groupchat.jid()) {
                    // you are the winner!
                    Jabberdy.askForNewWord()
                }
            },
        },
        
        initialized: function(ev) {
            Jabberdy.authenticate()
        },
        
        connected: function(ev) {
            Jabberdy.groupchat.join()
            
            $('#username').text(session.account.login)
      	    $('#connecting').hide()
            
            $(Jabberdy).trigger('choosingWhetherToWatchOrPlay')
            Jabberdy.ui.showDialog('#join-dialog')
        },
    
        choseToPlay: function() {
            Jabberdy.justWatching = false
            Jabberdy.askForNewWord()
        },
    
        choseToWatch: function() {
           Jabberdy.justWatching = true 
        },
    
        submittedGuess: function() {
            $('#guess').attr('disabled', true)
        },
    
        submittedNewWord: function() {
            $('#set-word').attr('disabled', true)
            $('#winner').hide()
        },
        
        unauthenticated: function(ev) {
            document.location.reload()
        }
    },
    
    
}