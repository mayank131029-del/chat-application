const socket = io('https://chat-application-server-at4k.onrender.com')
// const socket = io('http://localhost:8000')

const SUPABASE_URL = "https://nmcsuxvojkhspbgkusjw.supabase.co";
const SUPABASE_KEY = "sb_publishable_WZpMK8mLy33cgVPqPItFHw_dSf3wbX2";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const form = document.getElementById("message-form")
const messageinput = document.getElementById("message-input")
const chatcontainer = document.querySelector(".chat-box")
const navuser = document.getElementById("username")
const fileinput = document.getElementById("file-upload")
const file_img = document.getElementById("file")
const file_viewer = document.querySelector(".file-viewer")
const close_preview = document.getElementById("close-preview")
const userlist = document.querySelector(".active-user-list")
console.log(userlist)
var file, imagePath



messageinput.addEventListener("input", () => {
    socket.emit('typing')
    console.log(messageinput.value)
})

function scrolltoend() {
    chatcontainer.scrollTo(
        {
            top: chatcontainer.scrollHeight,
            behavior: "smooth"
        }
    )

}

scrolltoend()



fileinput.addEventListener("change", (e) => {
    file = e.target.files[0]
    if (!file)
        return

    imagePath = URL.createObjectURL(file);
    console.log(imagePath)
    file_viewer.classList.add("active")
    file_img.src = imagePath

})


close_preview.addEventListener("click", () => {
    file_img.src = ""
    file_viewer.classList.remove("active")
    file = null;
    imagePath = "";
    fileinput.value = "";

})




const append = (message, position, type) => {
    const chatelement = document.createElement("div")
    chatelement.innerText = message
    chatelement.classList.add(type)
    chatelement.classList.add(position)
    chatcontainer.append(chatelement)

}


const appendfile = (message, src, position) => {
    const fileelementp = document.createElement("div")
    const fileelement = document.createElement("img")
    fileelementp.classList.add("file")
    fileelement.classList.add("chatfile")
    fileelement.src = src
    fileelementp.classList.add(position)
    fileelementp.innerText = message

    chatcontainer.append(fileelementp)
    fileelementp.append(fileelement)
    fileelement.addEventListener("load", () => {
        scrolltoend()
    })
}

let typingmsg, typingtime
const appendtypingindicator = (username) => {
    clearTimeout(typingtime)

    if (!typingmsg) {
        typingmsg = document.createElement("div")
        typingmsg.classList.add("typingind")
        typingmsg.innerText = `${username} is typing ...`
        chatcontainer.append(typingmsg)
    }


    typingtime = setTimeout(() => {
        if (typingmsg) {
            typingmsg.remove()
            typingmsg = null
        }
    }, 1000);

}



const username = prompt("Enter your Name to Join") || "Guest"
const room = prompt("Enter Room Name: ")
function changeRoom() {
    const newRoom = prompt("Enter new room name");

    if (newRoom) {
        socket.emit('join-room', newRoom);
    }
}
navuser.innerText = username

socket.emit('join-room', room)
socket.emit('new-user-joined', username)

socket.on('user-joined', name => {
    append(`${name} joined the chat`, 'center', 'info')
})

socket.on('room-users-update', data => {

    userlist.innerHTML = ""

    data.forEach(user => {
        const newuser = document.createElement("div")
        newuser.innerText = user
        newuser.classList.add("active-user-name")
        userlist.append(newuser)
    });
})



async function uploadImage(file) {
    // console.log("Selected file:", file);

    const fileName = `${Date.now()}-${file.name}`;

    const { data, error } = await supabaseClient.storage
        .from("chat-images")
        .upload(fileName, file);

    // console.log("Supabase data:", data);
    // console.log("Supabase error:", error);

    if (error) {
        console.error("UPLOAD ERROR:", error);
        // alert(error.message);
        return null;
    }

    const { data: publicUrlData } =
        supabaseClient.storage
            .from("chat-images")
            .getPublicUrl(fileName);

    // console.log("Image URL:", publicUrlData.publicUrl);  

    return publicUrlData.publicUrl;
}


form.addEventListener("submit", async (e) => {
    e.preventDefault()
    const message = messageinput.value
    if (message !== "") {
        append(`You: ${message}`, 'right', 'message')
        socket.emit('send', message)
        messageinput.value = ""
        scrolltoend()
    }

    if (file) {

        file_viewer.classList.remove("active");
        const imageUrl = await uploadImage(file);

        console.log("URL received:", imageUrl);

        if (imageUrl) {
            appendfile("You:", imageUrl, "right");

            socket.emit("file-send", imageUrl);
            scrolltoend()
        }

        file = null;
        fileinput.value = "";
        file_img.src = "";

    }
})


socket.on('receive', data => {
    append(`${data.name}: ${data.message}`, 'left', 'message')
    scrolltoend()
})


socket.on('leave', (name) => {
    append(`${name} leave the chat`, 'center', 'info')
    scrolltoend()
})


socket.on('file-receive', (data) => {
    appendfile(`${data.name}:`, data.src, 'left');
    scrolltoend()
});

socket.on('typing', username => {
    appendtypingindicator(username)
    scrolltoend()
})



