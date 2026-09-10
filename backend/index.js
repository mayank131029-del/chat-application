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
let cleanupTimer = null;

io.on('connection', (socket) => {
    socket.on('new-user-joined', username => {

        if (cleanupTimer) {
            clearTimeout(cleanupTimer);
            cleanupTimer = null;
            console.log("Cleanup cancelled - user reconnected");
        }
        users[socket.id] = username;
        socket.broadcast.emit('user-joined', username)
    })

    socket.on('send', message => {
        socket.broadcast.emit('receive', { message: message, name: users[socket.id] })
    })

    socket.on('disconnect', () => {

        const username = users[socket.id];
        socket.broadcast.emit('leave', users[socket.id])
        delete users[socket.id]

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

    console.log(`Deleted ${files.length} image(s) from storage.`);
}
