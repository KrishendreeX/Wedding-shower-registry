/* ==========================================================
   Melissa & Chad · Wedding Shower Registry
   ========================================================== */
(() => {
    "use strict";

    /* ---------------- SETTINGS ---------------- */
    const CONFIG = {
        // Paste your Google Apps Script web-app URL between the quotes (see README.md).
        // While this is empty the page runs in preview mode (claims saved on this device only).
        APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwDPPA0JvSAYg9aN70w7WMhvCA5ex-n4wMGJ4cMm7naxXSMekCtgAeOfsFM1PZmTlhc6g/exec",

    };

    /* ---------------- THE REGISTRY ---------------- */
    const REGISTRY = [
        { title: "Pantry & Staples", items: ["Rice", "Pasta and spaghetti", "Macaroni", "Flour", "Sugar", "Salt", "Breakfast cereal"] },
        { title: "Tinned & Bottled Goods", items: ["Baked beans", "Sweetcorn", "Pilchards", "Tuna", "Peanut butter", "Jam", "Honey"] },
        { title: "Culinary Essentials", items: ["Cooking oil", "Vinegar", "Mayonnaise", "Tomato sauce", "Chutney", "Mustard", "Soy sauce", "Black pepper", "Paprika", "Mixed herbs", "Curry powder", "Garlic powder", "Chicken spice", "Barbecue spice"] },
        { title: "Tea, Coffee & Beverages", items: ["Tea bags", "Coffee", "Long-life milk", "Powdered milk", "Cordial or squash"] },
        { title: "Sweets & Treats", items: ["Biscuits", "Crackers", "Popcorn", "Chips", "Sweets or chocolates", "Dried fruit", "Nuts"] },
        { title: "Home & Cleaning", items: ["Dishwashing liquid", "Sponges and scourers", "Dishcloths", "Multipurpose cleaner", "Bleach", "Floor cleaner", "Washing powder or liquid", "Fabric softener", "Refuse bags", "Paper towels", "Toilet paper", "Aluminium foil", "Cling wrap"] },
        { title: "Fresh Market", items: ["Potatoes", "Onions", "Carrots", "Tomatoes", "Butternut", "Garlic", "Ginger", "Fresh fruit", "Bread", "Eggs", "Butter or margarine", "Cheese"] },
    ];

    /* ---------------- HELPERS ---------------- */
    const $ = (sel, root = document) => root.querySelector(sel);
    const DEMO = !String(CONFIG.APPS_SCRIPT_URL || "").trim();
    const KEYS = { demoClaims: "registry.demoClaims", mine: "registry.mine", guest: "registry.guest" };

    const store = {
        get(key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (e) { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
        },
    };

    const SCRATCH_SVG =
        '<svg class="scratch" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">' +
        '<path pathLength="1" d="M1 6 C 20 1, 35 9, 55 4 S 85 8, 99 3"/>' +
        '<path pathLength="1" d="M2 3 C 25 8, 45 1, 65 6 S 90 2, 98 7"/></svg>';

    /* ---------------- STATE ---------------- */
    const itemsById = new Map();   // id -> { id, name, category }
    const nodes = new Map();       // id -> { li, btn, tag }
    const sections = [];           // { el, count, ids }
    const claimed = new Set();
    const mine = new Set(store.get(KEYS.mine, []));
    let currentId = null;
    let refreshing = false;

    /* ---------------- BUILD THE LIST ---------------- */
    function buildRegistry() {
        const root = $("#registry");
        let n = 0;

        REGISTRY.forEach((cat) => {
            const section = document.createElement("section");
            section.className = "category";

            const h2 = document.createElement("h2");
            const title = document.createElement("span");
            title.textContent = cat.title;
            const count = document.createElement("small");
            count.className = "cat-count";
            h2.append(title, count);

            const ul = document.createElement("ul");
            const ids = [];

            cat.items.forEach((name) => {
                const item = { id: `item${++n}`, name, category: cat.title };
                itemsById.set(item.id, item);
                ids.push(item.id);

                const li = document.createElement("li");
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "gift";
                btn.dataset.id = item.id;
                btn.innerHTML =
                    '<span class="gift-ring" aria-hidden="true"></span>' +
                    '<span class="gift-name"><span class="gift-text"></span>' + SCRATCH_SVG + "</span>" +
                    '<span class="gift-tag"></span>';
                $(".gift-text", btn).textContent = name;
                btn.addEventListener("click", () => openClaim(item.id));

                li.appendChild(btn);
                ul.appendChild(li);
                nodes.set(item.id, { li, btn, tag: $(".gift-tag", btn) });
            });

            section.append(h2, ul);
            root.appendChild(section);
            sections.push({ el: section, count, ids });
        });
    }

    /* ---------------- PAINT STATE ---------------- */
    function paint(id) {
        const { li, btn, tag } = nodes.get(id);
        const item = itemsById.get(id);
        const isClaimed = claimed.has(id);
        const isMine = isClaimed && mine.has(id);

        li.classList.toggle("claimed", isClaimed);
        btn.classList.toggle("claimed", isClaimed);
        btn.classList.toggle("mine", isMine);
        btn.disabled = isClaimed;
        tag.textContent = isMine ? "Yours" : isClaimed ? "Claimed" : "Choose";
        btn.setAttribute(
            "aria-label",
            isMine ? `${item.name}, you’re bringing this` : isClaimed ? `${item.name}, already claimed` : `Choose ${item.name}`
        );
    }

    function updateSummary() {
        const total = itemsById.size;
        const done = claimed.size;

        $("#progress-text").textContent =
            done >= total && total > 0
                ? "✨ Every item is spoken for. Thank you for helping us stock our new chapter! ✨"
                : `${done} of ${total} items claimed`;
        $("#progress-bar").style.width = `${total ? (done / total) * 100 : 0}%`;

        sections.forEach((s) => {
            const left = s.ids.filter((id) => !claimed.has(id)).length;
            s.count.textContent = left === 0 ? "all claimed" : `${left} of ${s.ids.length} left`;
            s.el.classList.toggle("all-claimed", left === 0);
        });
    }

    function applyClaimed(ids) {
        claimed.clear();
        (ids || []).forEach((id) => { if (itemsById.has(id)) claimed.add(id); });

        // forget "mine" marks for anything that is no longer claimed
        let pruned = false;
        mine.forEach((id) => { if (!claimed.has(id)) { mine.delete(id); pruned = true; } });
        if (pruned) store.set(KEYS.mine, [...mine]);

        itemsById.forEach((_, id) => paint(id));
        updateSummary();
    }

    /* ---------------- SERVER ---------------- */
    async function api(method, payload) {
        const base = CONFIG.APPS_SCRIPT_URL.trim();
        const options = method === "POST"
            ? { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) }
            : {};
        const url = method === "GET" ? `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}` : base;
        const res = await fetch(url, options);
        return res.json();
    }

    async function refresh() {
        if (refreshing) return;
        refreshing = true;
        const registry = $("#registry");
        try {
            let ids;
            if (DEMO) {
                ids = store.get(KEYS.demoClaims, []);
            } else {
                const res = await api("GET");
                if (!res || !res.ok) throw new Error("Bad response");
                ids = res.claimed;
            }
            applyClaimed(ids);
            $("#sync-note").hidden = true;
        } catch (err) {
            $("#sync-note").hidden = false;
            updateSummary();
        } finally {
            registry.classList.remove("loading");
            refreshing = false;
        }
    }

    async function submitClaim(item, guest) {
        if (DEMO) {
            const list = store.get(KEYS.demoClaims, []);
            if (list.includes(item.id)) return { ok: false, error: "taken" };
            list.push(item.id);
            store.set(KEYS.demoClaims, list);
            return { ok: true };
        }
        return api("POST", {
            itemId: item.id,
            item: item.name,
            category: item.category,
            name: guest.name,
            email: guest.email,
            website: guest.website,
        });
    }

    /* ---------------- DIALOG ---------------- */
    const dlg = $("#claim-dialog");
    const form = $("#claim-form");
    const nameInput = $("#guest-name");
    const emailInput = $("#guest-email");
    const errorBox = $("#form-error");
    const submitBtn = $("#submit-btn");

    function showError(message) {
        errorBox.textContent = message || "";
        errorBox.hidden = !message;
    }

    function setBusy(busy) {
        submitBtn.disabled = busy;
        $("#cancel-btn").disabled = busy;
        submitBtn.textContent = busy ? "Saving…" : "I’ll bring this";
    }

    function openClaim(id) {
        const item = itemsById.get(id);
        if (!item || claimed.has(id)) return;
        currentId = id;

        $("#dlg-title").textContent = item.name;
        $("#dlg-category").textContent = item.category;
        showError("");
        setBusy(false);

        const saved = store.get(KEYS.guest, {});
        if (!nameInput.value) nameInput.value = saved.name || "";
        if (!emailInput.value) emailInput.value = saved.email || "";

        dlg.showModal();
        (nameInput.value ? emailInput : nameInput).focus();
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;

        const item = itemsById.get(currentId);
        if (!item) return;

        const guest = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            website: form.elements.website.value,
        };

        setBusy(true);
        showError("");

        try {
            const res = await submitClaim(item, guest);

            if (res && res.ok) {
                claimed.add(item.id);
                mine.add(item.id);
                store.set(KEYS.mine, [...mine]);
                store.set(KEYS.guest, { name: guest.name, email: guest.email });
                paint(item.id);
                updateSummary();
                dlg.close();
                const first = guest.name.split(/\s+/)[0];
                toast(`Thank you, ${first}! ${item.name} is yours to bring.` + (DEMO ? "" : " A confirmation is on its way to your inbox."));
            } else if (res && res.error === "taken") {
                claimed.add(item.id);
                paint(item.id);
                updateSummary();
                dlg.close();
                toast("Someone just claimed that one. Please choose something else.");
            } else {
                showError((res && res.message) || "Something went wrong. Please try again.");
            }
        } catch (err) {
            showError("We couldn’t save that. Please check your connection and try again.");
        } finally {
            setBusy(false);
        }
    });

    $("#cancel-btn").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); }); // click on backdrop

    /* ---------------- TOAST ---------------- */
    let toastTimer;
    function toast(message) {
        const el = $("#toast");
        el.textContent = message;
        el.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove("show"), 5200);
    }

    /* ---------------- FILTER ---------------- */
    $("#only-available").addEventListener("change", (e) => {
        $("#registry").classList.toggle("hide-claimed", e.target.checked);
    });

    /* ---------------- START ---------------- */
    if (DEMO) $("#demo-note").hidden = false;

    buildRegistry();
    updateSummary();
    refresh();

    // keep the list fresh when guests come back to the tab
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && !dlg.open) refresh();
    });

    // Keep already-open pages in sync with claims made on other devices.
    setInterval(() => {
        if (!document.hidden && !dlg.open) refresh();
    }, 15000);
})();