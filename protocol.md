S&G protocol specification
==========================


The Web Sockets protocol used by the S&G server and client applications to communicate with each other during a game is based on JSON strings in UTF-8 format.


Message format
--------------

All protocol commands are sent in the following format:

```javascript
{
    // command name
    "cmd": String,
    
    // associated data payload (optional)
    "data": {Any}
}
```


Commands
--------

The following protocol commands are available, with their associated data payload (if any).


### Handshake

When connecting to a game, the following handshake procedure is followed.

#### 1. `HOWDY`

Sent from the client to the server to initiate handshake.

#### 2. `GDAYMATE`

Sent from the server to the client to acknowledge handshake.

#### 3. `LEMMEIN`

Sent from the client to the server to request access to a game.

###### Data

```javascript
String      // player nickname
```

#### 4a. `CMONIN`

Sent from the server to the client if access is granted.

#### 4b. `FULLHOUSE`

Sent from the server to the client if the game is full.

#### 4c. `DOPPELGANGER`

Sent from the server to the client if the nickname is already taken by another player in the game.


### Client to server

The following commands can be sent from the client to the server during the course of a game.

#### `DOODLE`

Notifies the server that a shape has been drawn.

###### Data

```javascript
{
    // shape type
    "type": String,
    
    // line width
    "width": Number,
    
    // color (CSS color string)
    "color": String,
    
    // shape coordinates (each element is an array of the form [x, y])
    "points": Array
}
```

#### `OOPS`

Notifies the server that the last drawn shape should be removed.

#### `QUOTH`

Sends a chat message to the server.

###### Data

```javascript
String      // message text
```

#### `SCRAP`

Notifies the server that all drawn shapes should be removed.

#### `SEEYA`

Notifies the server that the client is disconnecting.


### Server to client

The following commands can be sent from the server to the client during the course of a game.

#### `DOODLE`

Notifies the client to draw a shape.

###### Data

See corresponding [client-side command](#doodle).

#### `GOTIT`

Notifies the client that a correct guess has been entered.

###### Data

```javascript
{
    // nickname of the player who entered the correct guess
    "nick": String,
    
    // the secret word being guessed on
    "word": String
}
```

#### `ITSABUST`

Notifies the client that no one managed to enter a correct guess before time ran out.

###### Data

```javascript
String      // the secret word being guessed on
```

#### `OOPS`

Notifies the client that the last drawn shape should be removed.

#### `PEEKABOO`

Notifies the client that a new player has entered the game.

###### Data

```javascript
String      // nickname of the new player
```

#### `POSSE`

Sends a list of current player standings to the client. The list is sorted in connection order.

###### Data

```javascript
[
    {
        // player nickname
        "nick": String,
        
        // player points
        "points": Number
    },
    ...
]
```

#### `QUOTH`

Sends a chat message to the client.

###### Data

```javascript
{
    // message type ("chat" for standard message)
    "type": String,
    
    // message author
    "nick": String,
    
    // message contents
    "text": String
}
```

#### `SCRAP`

Notifies the client that all drawn shapes should be removed.

#### `SHUTEYE`

Notifies the client that the game is paused.

#### `SKEDADDLE`

Notifies the client that a player has left the game.

###### Data

```javascript
String      // nickname of the departed player
```

#### `THEYREIT`

Notifies the client who the current drawer is.

###### Data

```javascript
String      // nickname of currently drawing player
```

#### `TMINUS`

Notifies the client how much time remains to draw/guess on the current word.

```javascript
Number      // time left in countdown, in whole seconds
```

#### `YOUREIT`

Notifies the client that they are the current drawer.

###### Data

```javascript
String      // the word to draw
```
