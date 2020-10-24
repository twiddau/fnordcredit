let socket = io.connect(window.location.protocol + '//' + window.location.host);
let rfidSocket = io.connect("ws://127.0.0.1:23421");

let accounts = [];
let filter = "";
let sortby = "time"; //valid values: time abc zyx

let products = [];


dust.helpers.currency = function(chunk, context, bodies, params) {
    let value = parseFloat(params.value);
    let prefix = params.prefix;
    
    if (prefix != null) {
        chunk.write(prefix);
    }

    chunk.write(value.toFixed(2) +  " €");
    return chunk;
};

dust.helpers.formatDate = function(chunk, context, bodies, params) {
    var value = dust.helpers.tap(params.value, chunk, context),
        timestamp,
        month,
        date,
        year,
        hours,
        minutes,
        seconds;
    timestamp = new Date(value);
    
    month = (timestamp.getMonth() + 1).toString();
    date = timestamp.getDate().toString();
    year = timestamp.getFullYear().toString();
    hours = timestamp.getHours().toString();
    minutes = timestamp.getMinutes().toString();
    seconds = timestamp.getSeconds().toString();

    if (month.length < 2) month = "0" + month;
    if (date.length < 2) date = "0" + date;
    if (hours.length < 2) hours = "0" + hours;
    if (minutes.length < 2) minutes = "0" + minutes;
    if (seconds.length < 2) seconds = "0" + seconds;

    return chunk.write(year + '-' + month + '-' + date + ' ' + hours + ':' + minutes + ':' + seconds);
};


function getUserDetail(username, pincode) {
    lockUi();

    var successful = function(userdata, transactions) {
        releaseUi();
        showDetail(userdata[0], transactions[0], pincode);
    }

    var error = function(error1, error2) {
        releaseUi();
        if (error1.status === 401 || error2.status == 401) {
            hidePinpad();
            showPinpad(username, function (username, pincode) {
                hidePinpad();
                getUserDetail(username, pincode);
            });
            return;
        }

        var error = "Errors: ";
        if (error1.statusText) error += error1.statusText + "<br />";
        if (error2.statusText) error += error2.statusText + "<br />";

        showFailureOverlay(error);
    }

    var transactions = requestUserLastTransactions(username, pincode);
    var userdetails = requestUserDetail(username, pincode);

    $.when(userdetails, transactions).then(successful, error);

}

function requestUserDetail(username, pincode) {
    return $.ajax({
        url: "/user/" + username,
        type: "GET",
        dataType: "json",
        headers: {
            "X-User-Pincode": pincode
        }
    });
}

function requestUserLastTransactions(username, pincode) {
    return $.ajax({
        url: "/transactions/" + username + "/last",
        type: "GET",
        dataType: "json",
        headers: {
            "X-User-Pincode": pincode
        }
    });
}

function getUserByToken(token) {
    lockUi();
    $.ajax({
        url: "/token/" + token,
        type: "GET",
        dataType: "json",

        success: function (user) {
            releaseUi();
            if (!user != null) {
                getUserDetail(user.name, token);
            }
        },
        error: function (err) {
            releaseUi();
            showFailureOverlay(err.responseText);
        }
    });
}

function showDetail(userData, transactions, pincode) {
    var saldo = 0;
    accounts.forEach(function (account) {
        saldo += account.credit;
    });

    $.get('templates/user-details.dust.html', function(template) {
        dust.renderSource(template, {"user": userData, "products": products, "transactions": transactions }, function(err, out) {
            $("#details").html(out);

            // Credit buttons
            $("button.btn-credit-action[data-credit!=''][data-credit]").click(function () {
                changeCredit(userData, pincode, $(this).attr("data-credit"), $(this).attr("data-desc"), $(this).attr("data-name"), $(this));
                resetTimer();
            });

            // rename Button
            $("#renameButton").click(function () {
                renameUser(userData, pincode);
            });

            // rename Button
            $("#changeTokenButton").click(function () {
                changeToken(userData, pincode);
            });

            // set PIN button
            $("#changeSetPinButton").click(function () {
                showPinpad(userData.name, function (username, newPincode) {
                    hidePinpad();
                    changePin(username, pincode, newPincode);
                });
            });

            changeView("details");
        });
    });
}

function showStatistics() {
    var saldo = 0;
    accounts.forEach(function (account) {
        saldo += account.credit;
    });

    $.get('templates/statistics.dust.html', function(template) {
        dust.renderSource(template, { "saldo": saldo }, function(err, out) {
            $("#view-statistics").html(out);
        });
    });

}

function getAllUsers() {
    $('#accounts').empty();

    accounts.sort(function (a, b) {
        switch (sortby) {
            case "time":
                var aDate = new Date(a.lastchanged);
                var bDate = new Date(b.lastchanged);
                return (aDate < bDate) ? 1 : -1;
            case "abc":
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            case "zyx":
                return b.name.toLowerCase().localeCompare(a.name.toLowerCase());
            default:
                throw "Invalid sorting criteria"
        }

    });

    var filtered = accounts.filter(function (account) {
        return account.name.toLowerCase().indexOf(filter) !== -1
    });

    $.get('templates/overview.dust.html', function(template) {
        dust.renderSource(template, { users: filtered }, function(err, out) {
            $("#accounts").html(out);

            $(".account.user").click(function(e) {
                getUserDetail($(this).attr("data-name"), null);
            });

            $(".account.new-user").click(function(e) {
               newUser();
            });
        });
    });
}

function newUser() {
    $.get('templates/new-user.dust.html', function(template) {
        dust.renderSource(template, {}, function(err, out) {
            $("#view-newuser").html(out);

            $("#newUserForm").submit(function (e) {
                lockUi();
                e.preventDefault();
                $.ajax({
                    url: '/user/add',
                    type: "POST",
                    data: $('#newUserForm').serialize(),
                    success: function () {
                        releaseUi();
                        changeView('accounts');
                    },
                    error: function (err) {
                        releaseUi();
                        showFailureOverlay(err.responseText);
                    }
                });
            });
            changeView('newuser');
        });
    });
}

function renameUser(userData, pincode) {
    $.get('templates/rename-user.dust.html', function(template) {
        dust.renderSource(template, {"user": userData}, function(err, out) {
            $("#renameuser").html(out);

            $("#renameUserForm").submit(function (e) {
                lockUi();
                e.preventDefault();
                $.ajax({
                    url: '/user/rename',
                    type: "POST",
                    data: $('#renameUserForm').serialize(),
                    headers: {
                        "X-User-Pincode": pincode
                    },
                    success: function () {
                        userData.name = $('#newname').val();
                        getUserDetail(userData.name, pincode);
                        releaseUi();
                    },
                    error: function (err) {
                        releaseUi();
                        showFailureOverlay(err.responseText);
                    }
                });
            });

            changeView('rename');
        });
    });
}


function changeToken (userData, pincode) {

    $.get('templates/change-token.dust.html', function(template) {
        dust.renderSource(template, {"user": userData}, function(err, out) {
            $("#changetoken").html(out);

            $("#changeTokenForm").submit(function (e) {
                lockUi();
                e.preventDefault();
                $.ajax({
                    url: '/user/change-token',
                    type: "POST",
                    data: $('#changeTokenForm').serialize(),
                    headers: {
                        "X-User-Pincode": pincode
                    },
                    success: function () {
                        getUserDetail(userData.name, pincode);
                        releaseUi();
                    },
                    error: function (err) {
                        releaseUi();
                        showFailureOverlay(err.responseText);
                    }
                });
            });
            changeView('changetoken');
        });
    });
}

function changePin(username, pincode, newPincode) {
    lockUi();
    $.ajax({
        url: '/user/change-pin',
        type: "POST",
        data: {
            username: username,
            pincode: newPincode
        },
        headers: {
            "X-User-Pincode": pincode
        },
        success: function () {
            releaseUi();
            getUserDetail(username, newPincode);
        },
        error: function (err) {
            releaseUi();
            showFailureOverlay(err.responseText);
        }
    });
}

function changeView(view) {
    resetTimer();
    $('.view').hide();
    switch (view) {
        case 'details':
            $('#details').show();
            break;
        case 'accounts':
            socket.emit('getAccounts');
            $('#accounts').show();
            $("nav").show();
            break;
        case 'newuser':
            $('#view-newuser').show();
            break;
        case 'rename':
            $('#renameuser').show();
            break;
        case 'changetoken':
            $('#changetoken').show();
            break;
        case 'statistics':
            socket.emit('getAccounts');
            showStatistics();
            $('#view-statistics').show();
            break;

        default:
            throw 'Invalid View: ' + view;
    }
}

var timer = null;
function resetTimer() {
    clearTimeout(timer);
    timer = setTimeout(function () {
        hidePinpad();
        changeView('accounts');
    }, 23.42 * 1000);
}


function changeCredit(userData, pincode, delta, description, product, productObj) {
    description = description || null;
    product = product || null;

    lockUi();
    $.ajax({
        url: "/user/credit",
        type: "POST",
        dataType: "json",
        data: {
            "username": userData.name,
            "delta": delta,
            "product": product,
            "description": description
        },
        headers: {
            "X-User-Pincode": pincode
        },
        success: function (data) {
            message = productObj.attr("data-desc");
            if (productObj != null) {
                imgObj = $($(productObj).find("img:first").first());
                if (imgObj != null && imgObj.attr("src") != null) {
                    console.log(imgObj);

                    htmlMessage = $("<div>");

                    img = $("<img>");
                    img.attr("src", imgObj.attr("src"));

                    htmlMessage.append(img);
                    htmlMessage.append($("<br>"));
                    htmlMessage.append(productObj.attr("data-desc"));
                    message = htmlMessage.html();

                    console.log(message);
                }
            }
            showSuccessOverlay(message);
            getUserDetail(userData.name, pincode);
            releaseUi();
        },
        error: function (err) {
            showFailureOverlay(err.responseText);
            releaseUi();
        }
    });
}

function lockUi() {
    $("#uilock").modal({
        backdrop: false,
        keyboard: false
    })
}

function releaseUi() {
    $("#uilock").modal('hide')
}


function showPinpad(username, cb) {
    $.get('templates/pinpad.dust.html', function(template) {
        dust.renderSource(template, {"username": username}, function(err, out) {

            $("#pinwindow").html(out);

            for (var i = 0; i <= 9; i++) {
                $('#pinpad-num-' + i).on('click', function (e) {
                    var field = $('#pinwindow-pin');
                    field.val(field.val() + e.target.textContent);
                    resetTimer();
                });
            }
            $("#pinwindowForm").submit(function (e) {
                e.preventDefault();
                cb($("#pinwindow-user").val(), $("#pinwindow-pin").val());
                return false;
            });

            $('#pinpad-ok').click(function () {
                $("#pinwindowForm").submit();
            });

            $('#pinpad-back').click(function () {
                hidePinpad();
            });

            $("#pinwindow").modal({
                backdrop: "static",
                keyboard: false,
            })

        });
    });
}

function hidePinpad() {
    $("#pinwindow-pin").val("");
    $("#pinwindow").modal('hide');
    $("#pinwindow-content").empty();
}

socket.on('accounts', function (data) {
    accounts = JSON.parse(data);
    getAllUsers();
});

socket.on('products', function (data) {
    products = JSON.parse(data);
});

socket.on('ka-ching', function () {
    var p = $('#ka-ching').get(0);
    p.pause();
    p.currentTime = 0;
    p.play();
});

socket.on('one-up', function () {
    var p = $('#one-up').get(0);
    p.pause();
    p.currentTime = 0;
    p.play();
});

function updateFilter() {
    filter = $("#search input").get(0).value.toLowerCase();
    changeView("accounts")
}

function setup() {

    $("#search input").on("change", function() {
        updateFilter();
    });

    $("#search input").on("keyup", null, null, updateFilter);
    $("#search button").click(function (e) {
        //fix because click fires before the field is actually reseted
        e.preventDefault();
        $("#search").get(0).reset();
        updateFilter();
    });

    $("#searchtoggle").click(function () {
        if ($("#search").is(":visible")) {
            $("#search").get(0).reset();
            updateFilter();
            $("#searchtoggle").removeClass("active");
            $("#search").hide();
        } else {
            $("#searchtoggle").addClass("active");
            $("#search").show();
        }
    });
    $("#search").hide();


    $("#stats").click(function () {
        changeView('statistics')
    });
    $("#sorttime").click(function () {
        setSort("time")
    });
    $("#sortabc").click(function () {
        setSort("abc")
    });
    $("#sortzyx").click(function () {
        setSort("zyx")
    });


    $(document).scannerDetection({
        timeBeforeScanTest: 200,
        avgTimeByChar: 20,
        onComplete: function (barcode) {

            console.log(typeof document.activeElement);
            if (["input", "textarea"].indexOf(document.activeElement.tagName.toLowerCase()) !== -1) {
                window.setTimeout(function() {
                    console.log("Try to remove the barcode from the focused input field");
                    var activeElement = document.activeElement;
                    activeElement.value = activeElement.value.substring(0, activeElement.value.length - barcode.length);
                    $(activeElement).trigger("change");
                }, 2000);
            }

            console.log("Found barcode input: " + barcode);
            if (barcode.substr(0, 3) === "<U>") {
                // User barcode scanned
                if ($('#details').is(":visible")) {
                    // Logout from user page
                    changeView("accounts");
                } else if ($('#changetoken').is(":visible")) {
                    $('#newtoken').attr("value", barcode.substr(3));
                } else {
                    // Logout from any other page
                    getUserByToken(barcode.substr(3));
                }
            } else {
                // Product barcode scanned

                // When on user page, "click" the right button
                console.log("Searching product for ean " + barcode);

                var product = null;

                $.each(products, function (key, value) {
                    if (value.ean != null) {

                        eans = value.ean.split("|");
                        console.log(eans);
                        if (eans.indexOf(barcode) >= 0) {
                            console.log("Found product " + value.name + " in ean array");
                            product = value;
                            return false;
                        }
                    }
                });

                if (product != null) {
                    if ($('#details').is(":visible")) {

                        button = $("button[data-name='" + product.name + "']");

                        if ($(button).length > 0) {
                            button.click();
                        } else {
                            showFailureOverlay("Product not found.");
                        }
                    }
                } else {
                    showFailureOverlay("Product not found.");
                }
                product = null;
            }
        }
    });


    $("body").on("click", "[data-back-view]", function () {
        changeView($(this).attr("data-back-view"));
    });


    $(window).on("click scroll", resetTimer);
}


function showSuccessOverlay(message) {
    delay = 250;
    if (message != null && message.length > 0) {
        delay = 750;
    }

    $("#uilock-success-message").html(message);
    $("#uilock-success").fadeIn().delay(delay).fadeOut();
}

function showFailureOverlay(message) {
    delay = 250;
    if (message != null && message.length > 0) {
        delay = 2000;
    }

    $("#uilock-failure-message").html(message);
    $("#uilock-failure").fadeIn().delay(delay).fadeOut();
}



function setSort(by) {
    sortby = by;
    changeView("accounts");
    $(".sortbtn").removeClass("active");
    $("#sort" + by).addClass("active");
}

setup();
changeView('accounts');




rfidSocket.on('tag', function(data) {
    console.log("Received RFID Tag event.");
    console.log(data);
    tag = data;

    // User barcode scanned
    if ($('#details').is(":visible")) {
        // Logout from user page
        changeView("accounts");
    } else if ($('#changetoken').is(":visible")) {
        $('#newtoken').attr("value", tag.uid);
    } else {
        // Logout from any other page
        getUserByToken(tag.uid);
    }

});