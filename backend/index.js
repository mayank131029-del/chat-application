const io = require('socket.io')(process.env.PORT || 8000, {
    cors: {
        origin: "*"
    }
})

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const users = {}
const rooms = {}
let cleanupTimer = null;

io.on('connection', (socket) => {
    socket.on('new-user-joined', username => {
        if (cleanupTimer) {
            clearTimeout(cleanupTimer);
            cleanupTimer = null;
            console.log("Cleanup cancelled - user reconnected");
        }

        room = rooms[socket.id]
        users[socket.id] = username;
        // socket.broadcast.emit('user-joined', username)
        socket.to(room).emit('user-joined', username)
        const roomUsers = Object.keys(users)
            .filter(socketId => rooms[socketId] === room)
            .map(socketId => users[socketId]);
        io.to(room).emit('room-users-update', roomUsers)
        console.log(roomUsers)
        // socket.io(room).emit('user-joined-to-list', object.values(users))

    })

    socket.on('send', message => {
        const room = rooms[socket.id]

        socket.to(room).emit('receive', {
            message: message,
            name: users[socket.id]
        })

    });

    socket.on('disconnect', () => {

        const username = users[socket.id];
        const room = rooms[socket.id]

        socket.to(room).emit('leave', username)


        delete users[socket.id]
        const roomUsers = Object.keys(users)
            .filter(socketId => rooms[socketId] === room)
            .map(socketId => users[socketId]);
        io.to(room).emit('room-users-update', roomUsers)
        delete rooms[socket.id]

        if (Object.keys(users).length === 0) {
            console.log("No users connected. Starting 60-second cleanup timer...");

            cleanupTimer = setTimeout(async () => {

                // Check again whether anyone connected
                if (Object.keys(users).length === 0) {
                    console.log("60 seconds passed. Cleaning storage...");
                    await clearChatImages();
                } else {
                    console.log("User reconnected. Storage cleanup cancelled.");
                }

                cleanupTimer = null;

            }, 60000);
        }
    })

    socket.on('file-send', src => {
        socket.broadcast.emit('file-receive', { src: src, name: users[socket.id] })

    })

    socket.on('join-room', room => {
        const username = users[socket.id]
        const oldroom = rooms[socket.id]

        socket.to(oldroom).emit('leave', username)

        socket.leave(oldroom)
        socket.join(room)
        rooms[socket.id] = room

        socket.to(room).emit('user-joined', username)

        const oldroomusers = Object.keys(users)
            .filter(socketId => rooms[socketId] === oldroom)
            .map(socketId => users[socketId]);


        const roomUsers = Object.keys(users)
            .filter(socketId => rooms[socketId] === room)
            .map(socketId => users[socketId]);
        io.to(room).emit('room-users-update', roomUsers)

        if (oldroom) {
            io.to(oldroom).emit('room-users-update', oldroomusers)
        }

    })

    socket.on('typing', ()=>{
        const room = rooms[socket.id]
        const username = users[socket.id]

        socket.to(room).emit('typing', username)

    })

})



async function clearChatImages() {
    console.log("Checking Supabase storage...");

    const { data, error } = await supabaseAdmin.storage
        .from("chat-images")
        .list("", {
            limit: 1000,
            offset: 0
        });

    if (error) {
        console.error("Storage list error:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("Storage is already empty.");
        return;
    }

    const files = data.map(file => file.name);

    const { error: deleteError } = await supabaseAdmin.storage
        .from("chat-images")
        .remove(files);

    if (deleteError) {
        console.error("Storage delete error:", deleteError);
        return;
    }


}





