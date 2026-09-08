const io = require('socket.io')(8000, {
    cors: {
        origin: "http://127.0.0.1:3000"
    }
})

const users = {}

io.on('connection', (socket) => {
    socket.on('new-user-joined', username => {
        // console.log("new user joined:", username)
        users[socket.id] = username;
        socket.broadcast.emit('user-joined', username)
    })

    socket.on('send', message =>{
        socket.broadcast.emit('receive', {message:message, name:users[socket.id]})
    })

    socket.on('disconnect', ()=>{
        socket.broadcast.emit('leave', users[socket.id])
        delete users[socket.id]
    })
})

