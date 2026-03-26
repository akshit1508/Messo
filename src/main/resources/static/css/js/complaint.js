function openModal(btn) {
    console.log("complaint.js loaded ✅");

    const modal = document.getElementById("complaintModal");

    document.getElementById("mStudent").innerText =
        "👤 " + btn.dataset.student;

    document.getElementById("mType").innerText =
        btn.dataset.type;

    document.getElementById("mDesc").innerText =
        btn.dataset.desc;

    // ✅ Correct POST URL
    const form = document.getElementById("resolveForm");
    form.action = "/admin/complaint/resolve/" + btn.dataset.id;

    modal.style.display = "flex";
}

function closeModal() {
    document.getElementById("complaintModal").style.display = "none";
}

window.onclick = function (e) {
    const modal = document.getElementById("complaintModal");
    if (e.target === modal) modal.style.display = "none";
};
