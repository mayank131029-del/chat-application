const socket = io('https://chat-application-server-at4k.onrender.com')

const form = document.getElementById("message-form")
const messageinput = document.getElementById("message-input")
const chatcontainer = document.querySelector(".chat-box")
const navuser = document.getElementById("username")


const append = (message, position, type) => {
    const chatelement = document.createElement("div")
    chatelement.innerText = message
    chatelement.classList.add(type)
    chatelement.classList.add(position)
    chatcontainer.append(chatelement)
}


const username = prompt("Enter your Name to Join") || "Guest"
navuser.innerText = username

socket.emit('new-user-joined', username)

socket.on('user-joined', name => {
    append(`${name} joined the chat`, 'center', 'info')
})


form.addEventListener("submit", (e) => {
    e.preventDefault()
    const message = messageinput.value
    append(`You: ${message}`, 'right', 'message')
    socket.emit('send', message)
    messageinput.value = ""
})

socket.on('receive', data => {
    append(`${data.name}: ${data.message}`, 'left', 'message')
})

socket.on('leave', (name) => {
    append(`${name} leave the chat`, 'center', 'info')
})