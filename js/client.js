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
var file, imagePath

function scrolltoend() {
    chatcontainer.scrollTo(
        {
            top: chatcontainer.scrollHeight,
            behavior: "smooth"
        }
    )

}

scrolltoend()
const username = prompt("Enter your Name to Join") || "Guest"
navuser.innerText = username


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
    scrolltoend()
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




socket.emit('new-user-joined', username)

socket.on('user-joined', name => {
    append(`${name} joined the chat`, 'center', 'info')
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

    }

    if (file) {

        file_viewer.classList.remove("active");
        const imageUrl = await uploadImage(file);

        console.log("URL received:", imageUrl);

        if (imageUrl) {
            appendfile("You:", imageUrl, "right");

            console.log("Sending URL through socket:", imageUrl);

            socket.emit("file-send", imageUrl);
        }

        file = null;
        fileinput.value = "";
        file_img.src = "";

    }
})


socket.on('receive', data => {
    console.log("TEXT RECEIVED BY CLIENT:", data);

    append(`${data.name}: ${data.message}`, 'left', 'message');
});


socket.on('leave', (name) => {
    append(`${name} leave the chat`, 'center', 'info')
})


socket.on('file-receive', (data) => {

    appendfile(`${data.name}:`, data.src, 'left');
}); 