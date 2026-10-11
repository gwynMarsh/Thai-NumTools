"use strict";

// Keep <select> elements as the data source/fallback. Only the rendered picker is custom.
const CustomSelect = (() => {
    const widgets = new WeakMap();
    const panel = document.createElement("div");
    panel.id = "formatOptions";
    panel.className = "select-options";
    panel.setAttribute("role", "listbox");
    panel.hidden = true;
    document.body.appendChild(panel);
    let active = null;
    let activeIndex = -1;
    let search = "";
    let searchTime = 0;

    function available(select) {
        return Array.from(select.options).map((option, index) => ({ option, index }))
            .filter(item => !item.option.disabled);
    }

    function refresh(select) {
        const widget = widgets.get(select);
        if (!widget) return;
        const option = select.options[select.selectedIndex];
        widget.text.textContent = option?.textContent || "Choose a currency first";
        widget.button.disabled = select.disabled || available(select).length === 0;
        if (active === widget) {
            if (widget.button.disabled || widget.button.closest("[hidden]")) close();
            else render();
        }
    }

    function close(restoreFocus = false) {
        if (!active) return;
        const button = active.button;
        button.setAttribute("aria-expanded", "false");
        button.removeAttribute("aria-activedescendant");
        panel.hidden = true;
        active = null;
        activeIndex = -1;
        search = "";
        if (restoreFocus) button.focus({ preventScroll: true });
    }

    function position() {
        if (!active) return;
        const rect = active.button.getBoundingClientRect();
        const viewport = window.visualViewport;
        const left = viewport?.offsetLeft || 0;
        const top = viewport?.offsetTop || 0;
        const width = viewport?.width || window.innerWidth;
        const height = viewport?.height || window.innerHeight;
        const margin = 12;
        if (rect.bottom < top || rect.top > top + height) return close();
        const panelWidth = Math.min(Math.max(rect.width, 240), width - margin * 2);
        panel.style.width = panelWidth + "px";
        panel.style.left = Math.max(left + margin, Math.min(rect.left, left + width - panelWidth - margin)) + "px";
        const below = top + height - rect.bottom - margin - 6;
        const above = rect.top - top - margin - 6;
        const opensAbove = below < 160 && above > below;
        const room = Math.max(60, opensAbove ? above : below);
        panel.style.maxHeight = Math.min(300, room) + "px";
        panel.style.top = (opensAbove ? rect.top - panel.offsetHeight - 6 : rect.bottom + 6) + "px";
    }

    function highlight(index) {
        activeIndex = index;
        for (const node of panel.children) {
            const isActive = Number(node.dataset.index) === index;
            node.classList.toggle("option-active", isActive);
            if (isActive) {
                active.button.setAttribute("aria-activedescendant", node.id);
                node.scrollIntoView({ block: "nearest" });
            }
        }
    }

    function render() {
        if (!active) return;
        panel.replaceChildren();
        panel.setAttribute("aria-labelledby", active.labelId);
        for (const { option, index } of available(active.select)) {
            const node = document.createElement("div");
            node.id = active.select.id + "Option" + index;
            node.className = "select-option";
            node.dataset.index = String(index);
            node.setAttribute("role", "option");
            node.setAttribute("aria-selected", String(index === active.select.selectedIndex));
            const text = document.createElement("span");
            text.textContent = option.textContent;
            const check = document.createElement("span");
            check.className = "option-check";
            check.setAttribute("aria-hidden", "true");
            check.textContent = index === active.select.selectedIndex ? "✓" : "";
            node.append(text, check);
            panel.appendChild(node);
        }
        const indices = available(active.select).map(item => item.index);
        if (!indices.includes(activeIndex)) activeIndex = indices.includes(active.select.selectedIndex)
            ? active.select.selectedIndex : indices[0];
        position();
        highlight(activeIndex);
    }

    function open(widget) {
        if (widget.button.disabled) return;
        close();
        active = widget;
        activeIndex = widget.select.selectedIndex;
        panel.hidden = false;
        widget.button.setAttribute("aria-expanded", "true");
        render();
    }

    function choose(index, restoreFocus = true) {
        if (!active || !available(active.select).some(item => item.index === index)) return;
        const widget = active;
        const changed = widget.select.selectedIndex !== index;
        widget.select.selectedIndex = index;
        close(restoreFocus);
        refresh(widget.select);
        if (changed) widget.select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function keydown(event, widget) {
        const key = event.key;
        if (key === "Escape" && active) { event.preventDefault(); return close(true); }
        if (key === "Tab") {
            if (active === widget) choose(activeIndex, false);
            return;
        }
        if (["Enter", " "].includes(key)) {
            event.preventDefault();
            if (active === widget) choose(activeIndex);
            else open(widget);
            return;
        }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) {
            event.preventDefault();
            const wasOpen = active === widget;
            if (!wasOpen) open(widget);
            const indices = available(widget.select).map(item => item.index);
            const current = indices.indexOf(activeIndex);
            if (key === "Home") highlight(indices[0]);
            else if (key === "End") highlight(indices[indices.length - 1]);
            else if (wasOpen) highlight(indices[Math.max(0, Math.min(indices.length - 1,
                current + (key === "ArrowDown" ? 1 : -1)))]);
            return;
        }
        if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            if (active !== widget) open(widget);
            const now = Date.now();
            search = now - searchTime > 700 ? key : search + key;
            searchTime = now;
            // Repeated letters cycle matching options; longer text searches codes or names.
            if (Array.from(search).every(char => char === key)) search = key;
            const options = available(widget.select);
            const start = options.findIndex(item => item.index === activeIndex);
            const ordered = [...options.slice(start + 1), ...options.slice(0, start + 1)];
            const query = search.toLocaleLowerCase();
            const match = ordered.find(item => item.option.textContent.toLocaleLowerCase().startsWith(query)) ||
                ordered.find(item => item.option.textContent.toLocaleLowerCase().includes(query));
            if (match) highlight(match.index);
        }
    }

    function enhance(root) {
        for (const select of root.querySelectorAll("select")) {
            if (widgets.has(select)) continue;
            const label = root.querySelector('label[for="' + select.id + '"]');
            if (!label) continue;
            label.id ||= select.id + "Label";
            const button = document.createElement("button");
            button.type = "button";
            button.id = select.id + "Button";
            button.className = "select-trigger";
            button.setAttribute("role", "combobox");
            button.setAttribute("aria-haspopup", "listbox");
            button.setAttribute("aria-expanded", "false");
            button.setAttribute("aria-controls", panel.id);
            const text = document.createElement("span");
            text.id = select.id + "Value";
            const arrow = document.createElement("span");
            arrow.className = "select-arrow";
            arrow.setAttribute("aria-hidden", "true");
            button.append(text, arrow);
            button.setAttribute("aria-labelledby", label.id + " " + text.id);
            label.htmlFor = button.id;
            select.hidden = true;
            select.setAttribute("aria-hidden", "true");
            select.tabIndex = -1;
            select.after(button);
            const widget = { select, button, text, labelId: label.id };
            widgets.set(select, widget);
            button.addEventListener("click", () => active === widget ? close() : open(widget));
            button.addEventListener("keydown", event => keydown(event, widget));
            select.addEventListener("change", () => refresh(select));
            refresh(select);
        }
    }

    panel.addEventListener("mousedown", event => event.preventDefault());
    panel.addEventListener("click", event => {
        const option = event.target.closest(".select-option");
        if (option) choose(Number(option.dataset.index));
    });
    document.addEventListener("pointerdown", event => {
        if (active && !active.button.contains(event.target) && !panel.contains(event.target)) close();
    });
    document.addEventListener("focusin", event => {
        if (active && !active.button.contains(event.target) && !panel.contains(event.target)) close();
    });
    window.addEventListener("resize", position);
    document.addEventListener("scroll", position, { capture: true, passive: true });
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return { enhance, refresh, close };
})();
