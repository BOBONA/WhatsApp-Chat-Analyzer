function copyToClipboard() {
    navigator.clipboard.writeText(document.getElementById("raw").innerText);
}

function downloadCsv(name, headers, data) {
    let csvContent = "";
    csvContent += headers.join(",") + "\r\n";
    for (let i in data) {
        let row = [];
        for (let j in headers) {
            row.push('"' + String(data[i][headers[j]]).replaceAll(/"/g, '""') + '"');
        }
        csvContent += row.join(",") + "\r\n";
    }
    var blob = new Blob([csvContent], {type: "text/plain;charset=utf-8"});
    saveAs(blob, name + ".csv");
}

function appendTable(name, headers, data) {
    let h3 = document.createElement("h3");
    let h3Text = document.createTextNode(name);
    let output = document.getElementById("output");
    h3.appendChild(h3Text);
    output.appendChild(h3);
    let exportBtn = document.createElement("button");
    exportBtn.onclick = () => {
        downloadCsv(name, headers, data);
    };
    let buttonText = document.createTextNode("Export CSV");
    exportBtn.appendChild(buttonText);
    output.appendChild(exportBtn);
    let table = document.createElement("table");
    let header = document.createElement("tr");
    for (let h in headers) {
        let th = document.createElement("th");
        let text = document.createTextNode(headers[h]);
        th.appendChild(text);
        header.appendChild(th);
    }
    table.append(header);
    for (let i in data) {
        let row = document.createElement("tr");
        for (let h in headers) {
            let td = document.createElement("td");
            let text = document.createTextNode(data[i][headers[h]]);
            td.appendChild(text);
            row.appendChild(td);
        }
        table.append(row);
    }
    output.appendChild(table);
}

function displayData(data, messages) {
    document.getElementById("raw").innerText = JSON.stringify(data, null, 2);
    document.getElementById("copy").style.display = "inline-block";
    document.getElementById("chatExport").style.display = "inline-block";
    document.getElementById("chatExport").onclick = () => {
        downloadCsv("log", ["author", "date", "chat", "message"], messages);
    }
    let output = document.getElementById("output");
    while (output.firstChild) {
        output.removeChild(output.lastChild);
    }
    appendTable("Average messages: ",
                ["Month", "aveMessage", "aveMessageP50", "aveMessageP75"],
                data.months.map((m) => Object.assign({}, {"Month": m[0]}, m[1])));
    appendTable("Message count per user: ",
                ["User"].concat(Object.keys(data.users[0][1].monthlyMessageCount)),
                data.users.map((u) => Object.assign({}, {"User": u[0]}, u[1].monthlyMessageCount)));
    appendTable("Average touch points: ",
                ["Month", "aveContact", "aveContactP50", "aveContactP75"],
                data.months.map((m) => Object.assign({}, {"Month": m[0]}, m[1])));
    appendTable("Touch points per user: ",
                ["User"].concat(Object.keys(data.users[0][1].monthlyContactCount)),
                data.users.map((u) => Object.assign({}, {"User": u[0]}, u[1].monthlyContactCount)));
}

function getLastMonths(count) {
    let months = [];
    let d = new Date();
    for (let i = 0; i < count; i++) {
        let m = d.getMonth();
        d.setMonth(d.getMonth() - 1);
        if (d.getMonth() == m) d.setDate(0);
        months.push(getMonth(d));
    }
    return months;
}

function getAverageInBracket(users, month, sortWith, bracketStart, bracketEnd) {
    users.sort((u1, u2) => {
        return u2[1][sortWith][month] - u1[1][sortWith][month];
    });
    let sliced = users.slice(bracketStart, Math.floor(users.length * bracketEnd));
    return Math.round(sliced.reduce((ac, user) => ac + user[1][sortWith][month], 0) / sliced.length);
}

function getMonth(date) {
    return (date.getMonth() + 1) + "/" + date.getFullYear();
}

function getDay(date) {
    return (date.getMonth() + 1) + "/" + date.getFullYear() + "/" + date.getDate();
}

function process(messages) {
    let monthsList = getLastMonths(document.getElementById("months").value);
    let monthlyCountObject = {};
    let months = {}
    for (let i in monthsList) {
        let month = monthsList[i];
        months[month] = {
            aveMessage: 0,
            aveMessageP50: 0,
            aveMessageP75: 0,
            aveContact: 0,
            aveContactP50: 0,
            aveContactP75: 0,
        }
        monthlyCountObject[month] = 0;
    }
    let users = {};
    for (let i in messages) {
        let message = messages[i];
        if (!(message.author in users)) {
            users[message.author] = {
                monthlyMessageCount: {},
                monthlyContactCount: {},
                messageDays: {},
            };
            Object.assign(users[message.author].monthlyMessageCount, monthlyCountObject);
            Object.assign(users[message.author].monthlyContactCount, monthlyCountObject);
        }
        let month = getMonth(message.date);
        if (month in users[message.author].monthlyMessageCount) {
            users[message.author].monthlyMessageCount[month]++;
            months[month].aveMessage++;
            let day = getDay(message.date) + "//" + message.chat;
            if (day in users[message.author].messageDays) {
                users[message.author].messageDays[day]++;
            } else {
                users[message.author].messageDays[day] = 1;
                users[message.author].monthlyContactCount[month]++;
                months[month].aveContact++;
            }
        }
    }
    let userArray = [];
    for (let i in monthsList) {
        let month = monthsList[i];
        months[month].aveMessage = Math.round(months[month].aveMessage / Object.keys(users).length);
        months[month].aveContact = Math.round(months[month].aveContact / Object.keys(users).length);
        let userList = Object.keys(users).map((key) => {
            return [key, users[key]];
        });
        months[month].aveMessageP50 = getAverageInBracket(userList, month, "monthlyMessageCount", 0, 0.5);
        months[month].aveMessageP75 = getAverageInBracket(userList, month, "monthlyMessageCount", 0, 0.25);
        months[month].aveContactP50 = getAverageInBracket(userList, month, "monthlyContactCount", 0, 0.5);
        months[month].aveContactP75 = getAverageInBracket(userList, month, "monthlyContactCount", 0, 0.25);
        if (i == monthsList.length - 1) {
            userArray = userList;
        }
    }
    let monthArray = [];
    for (let i in monthsList) {
        monthArray.push([monthsList[i], months[monthsList[i]]]);
    }
    displayData({months: monthArray, users: userArray}, messages);
}

function readTextFromFile(file, then) {
    let reader = new FileReader();
    reader.readAsText(file);
    reader.onload = (event) => {
        then(event.target.result);
    };
    reader.onerror = (event) => {
        console.log(error);
    };
}

function loadFiles() {
    let files = document.getElementById("logInput").files;
    let messages = [];
    let finished = 0;
    let fileProcessed = () => {
        finished++;
        if (finished === files.length) {
            process(messages);
        }
    };
    for (let i in files) {
        let file = files[i];
        if (typeof(file) === "object") {
            let extension = file.name.split(".").pop();
            if (extension === "txt") {
                readTextFromFile(file, (text) => {
                    whatsappChatParser
                        .parseString(event.target.result)
                        .then((messageList) => {
                            let chat = messageList[0].message.includes("WhatsApp") ? messageList[0].author : file.name;
                            messages = messages.concat(messageList.map((m) => {
                                m.chat = chat;
                                return m;
                            }));
                            fileProcessed();
                        })
                        .catch(err => {
                            console.log(err);
                        });
                });
            } else if (extension === "html") {
                readTextFromFile(file, (text) => {
                    let parser = new DOMParser();
                    let html = parser.parseFromString(text, "text/html");
                    let content = html.getElementsByClassName("content")[0].children;
                    let chat = content[0].innerText.substring(2);
                    let lastAuthor = "";
                    let newMessages = [];
                    let groupChat = false;
                    if (content.length < 3) {
                        fileProcessed();
                    } else if (content[2].tagName.toUpperCase() === "P") {
                        groupChat = true;
                    }
                    for (let i = 0; i < content.length; i++) {
                        let element = content[i];
                        if (element.tagName.toUpperCase() === "DIV") {
                            let date = element.firstElementChild.firstElementChild.textContent.split(' ');
                            let left = date[0].split('/');
                            let right = date[1].split(':');
                            let message = {
                                date: new Date(parseInt(left[2]), parseInt(left[0]) - 1, parseInt(left[1]),
                                                parseInt(right[0]), parseInt(right[1]), parseInt(right[2])),
                                author: "You",
                                message: element.children[1].firstElementChild.textContent
                            };
                            if (element.className === "triangle-lefttextgroundback") {
                                let text = element.children[1];
                                while (text.children.length > 0 && text.firstChild.nodeType != Node.TEXT_NODE && text.firstChild.tagName.toUpperCase() === "FONT") {
                                    text = text.firstChild;
                                }
                                if (text.childNodes.length === 1) {
                                    message.author = lastAuthor;
                                    message.message = text.textContent;
                                } else {
                                    message.author = text.firstChild.textContent;
                                    message.message = "";
                                    for (let i = 2; i < text.childNodes.length; i++) {
                                        message.message += text.childNodes[i].textContent;
                                    }
                                }
                                if (!groupChat) {
                                    message.author = chat;
                                }
                            } else if (element.className === "triangle-leftImageBackground") {
                                // the amount of weird formatting in iTransor html is horrifying, hence the edge cases
                                if (element.children[1].firstElementChild.firstElementChild === null) {
                                    message.author = chat;
                                } else {
                                    message.author = element.children[1].firstElementChild.firstElementChild.textContent;
                                }
                                if (!groupChat) {
                                    message.author = chat;
                                }
                            }
                            if (message.author[message.author.length - 1] === ":") {
                                message.author = message.author.slice(0, -1);
                            }
                            lastAuthor = message.author;
                            message.chat = chat;
                            newMessages.push(message);
                        }
                    }
                    for (let i = newMessages.length - 1; i >= 0; i--) {
                        let message = newMessages[i];
                        if (message.author === ":") {
                            if (i === newMessages.length - 1) {
                                message.author = newMessages[i - 1].author;
                            } else {
                                message.author = newMessages[i + 1].author;
                            }
                        }
                        if (message.author !== "") {
                            messages.push(message);
                        }
                    }
                    fileProcessed();
                });
            }
        }
    }
}

function buttonPressed() {
    loadFiles();
}
