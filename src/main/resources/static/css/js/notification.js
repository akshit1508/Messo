function closePopup() {
    document.getElementById("popup").style.display = "none";
}

window.onload = function () {
    const popup = document.getElementById("popup");
    if (popup) popup.style.display = "block";
};
