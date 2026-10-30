/**
 * Apollo UI - 玻璃拟态组件交互库
 * 轻量、零依赖、即插即用
 * https://noxkit.cn
 */
(function (global) {
    'use strict';

    /* ================================================================
     *  工具函数
     * ================================================================ */

    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

    function uid(prefix) { return (prefix || 'au') + '-' + Math.random().toString(36).slice(2, 9); }

    function el(tag, attrs, children) {
        var node = document.createElement(tag);
        if (attrs) Object.keys(attrs).forEach(function (k) {
            if (k === 'class') node.className = attrs[k];
            else if (k === 'style') node.style.cssText = attrs[k];
            else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
            else node.setAttribute(k, attrs[k]);
        });
        if (children) (Array.isArray(children) ? children : [children]).forEach(function (c) {
            if (typeof c === 'string') node.appendChild(document.createTextNode(c));
            else if (c) node.appendChild(c);
        });
        return node;
    }

    function onTransitionEnd(elem, cb, timeout) {
        var done = false;
        function finish() { if (!done) { done = true; cb(); } }
        elem.addEventListener('transitionend', finish, { once: true });
        setTimeout(finish, timeout || 400);
    }

    /* ================================================================
     *  Modal 弹窗
     * ================================================================ */

    var _modalStack = [];

    function createBackdrop() {
        return el('div', { class: 'au-modal-backdrop' });
    }

    /**
     * AU.modal(options) → 返回 { el, close }
     * options: { title, content (html string | DOM), footer (html | DOM | false), size, onClose, onConfirm }
     */
    function modal(opts) {
        opts = opts || {};
        var id = uid('modal');

        // Build inner content
        var headerEl = el('div', { class: 'au-modal-header' }, [
            el('h3', { class: 'au-modal-title' }, opts.title || ''),
            el('button', {
                class: 'au-modal-close',
                'aria-label': '关闭',
                innerHTML: '&times;',
                onclick: function () { close(); }
            })
        ]);

        var bodyEl = el('div', { class: 'au-modal-body' });
        if (typeof opts.content === 'string') bodyEl.innerHTML = opts.content;
        else if (opts.content) bodyEl.appendChild(opts.content);

        var footerEl = null;
        if (opts.footer !== false) {
            footerEl = el('div', { class: 'au-modal-footer' });
            if (typeof opts.footer === 'string') {
                footerEl.innerHTML = opts.footer;
            } else if (opts.footer) {
                footerEl.appendChild(opts.footer);
            } else {
                // Default: Cancel + Confirm
                var cancelBtn = el('button', {
                    class: 'au-btn au-btn--ghost',
                    onclick: function () { close(); }
                }, '取消');
                var confirmBtn = el('button', {
                    class: 'au-btn au-btn--primary',
                    onclick: function () {
                        if (typeof opts.onConfirm === 'function') {
                            var result = opts.onConfirm();
                            if (result === false) return; // prevent close
                        }
                        close();
                    }
                }, '确定');
                footerEl.appendChild(cancelBtn);
                footerEl.appendChild(confirmBtn);
            }
        }

        var cardChildren = [headerEl, bodyEl];
        if (footerEl) cardChildren.push(footerEl);

        var sizeClass = opts.size ? ' au-modal--' + opts.size : '';
        var card = el('div', { class: 'au-modal' + sizeClass, id: id }, cardChildren);
        var backdrop = createBackdrop();
        backdrop.appendChild(card);
        document.body.appendChild(backdrop);

        // Click backdrop to close
        backdrop.addEventListener('click', function (e) {
            if (e.target === backdrop) close();
        });

        // Animate in
        requestAnimationFrame(function () {
            backdrop.classList.add('au-visible');
        });

        _modalStack.push(id);

        function close() {
            if (backdrop.parentNode === null) return;
            backdrop.classList.remove('au-visible');
            onTransitionEnd(card, function () {
                if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
                var idx = _modalStack.indexOf(id);
                if (idx !== -1) _modalStack.splice(idx, 1);
                if (typeof opts.onClose === 'function') opts.onClose();
            });
        }

        return { el: card, backdrop: backdrop, close: close };
    }

    /**
     * AU.confirm(options) → Promise<boolean>
     * options: { title, message, confirmText, cancelText, danger }
     */
    function confirm(opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            var dangerClass = opts.danger ? ' au-btn--danger' : '';
            var cancelBtn = el('button', { class: 'au-btn au-btn--ghost' }, opts.cancelText || '取消');
            var confirmBtn = el('button', { class: 'au-btn au-btn--primary' + dangerClass }, opts.confirmText || '确定');

            var iconHtml = opts.danger
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

            var iconEl = el('div', { class: 'au-confirm-icon' + (opts.danger ? ' danger' : ''), innerHTML: iconHtml });
            var titleEl = el('h3', { class: 'au-confirm-title' }, opts.title || '确认操作');
            var msgEl = el('p', { class: 'au-confirm-message' }, opts.message || '确定要执行此操作吗？');

            var content = el('div', { class: 'au-confirm-content' }, [iconEl, titleEl, msgEl]);
            var footer = el('div', { class: 'au-confirm-actions' }, [cancelBtn, confirmBtn]);

            var m = modal({
                title: '',
                content: content,
                footer: footer,
                size: 'sm'
            });

            // Hide default header close button
            var closeBtn = $('.au-modal-close', m.el);
            if (closeBtn) closeBtn.style.display = 'none';
            // Remove default header
            var header = $('.au-modal-header', m.el);
            if (header) header.style.display = 'none';

            cancelBtn.addEventListener('click', function () {
                m.close();
                resolve(false);
            });
            confirmBtn.addEventListener('click', function () {
                m.close();
                resolve(true);
            });
        });
    }

    /* ================================================================
     *  Toast 轻提示
     * ================================================================ */

    var _toastContainer = null;

    function getToastContainer() {
        if (!_toastContainer) {
            _toastContainer = el('div', { class: 'au-toast-container' });
            document.body.appendChild(_toastContainer);
        }
        return _toastContainer;
    }

    var TOAST_ICONS = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    /**
     * AU.toast(message, type, duration)
     * type: 'success' | 'error' | 'warning' | 'info' (default)
     * duration: ms (default 3000)
     */
    function toast(message, type, duration) {
        type = type || 'info';
        duration = duration || 3000;

        var iconEl = el('span', { class: 'au-toast-icon', innerHTML: TOAST_ICONS[type] || TOAST_ICONS.info });
        var msgEl = el('span', { class: 'au-toast-message' }, message);
        var toastEl = el('div', { class: 'au-toast au-toast--' + type }, [iconEl, msgEl]);

        getToastContainer().appendChild(toastEl);

        requestAnimationFrame(function () {
            toastEl.classList.add('au-visible');
        });

        function remove() {
            toastEl.classList.remove('au-visible');
            toastEl.classList.add('au-leaving');
            onTransitionEnd(toastEl, function () {
                if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
            });
        }

        var timer = setTimeout(remove, duration);

        toastEl.addEventListener('click', function () {
            clearTimeout(timer);
            remove();
        });
    }

    /* ================================================================
     *  Dropdown 下拉菜单
     * ================================================================ */

    var _activeDropdown = null;

    function initDropdowns() {
        document.addEventListener('click', function (e) {
            // Close active dropdown on outside click
            if (_activeDropdown && !_activeDropdown.contains(e.target)) {
                closeDropdown(_activeDropdown);
            }

            var trigger = e.target.closest('[au-dropdown]');
            if (!trigger) return;

            var dropdownId = trigger.getAttribute('au-dropdown');
            var menu = document.getElementById(dropdownId);
            if (!menu) return;

            e.stopPropagation();

            if (menu.classList.contains('au-visible')) {
                closeDropdown(menu);
            } else {
                if (_activeDropdown) closeDropdown(_activeDropdown);
                openDropdown(menu, trigger);
            }
        });

        // Close on Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && _activeDropdown) {
                closeDropdown(_activeDropdown);
            }
        });
    }

    function openDropdown(menu, trigger) {
        // Position
        var rect = trigger.getBoundingClientRect();
        menu.style.top = (rect.bottom + 6) + 'px';
        menu.style.left = rect.left + 'px';
        menu.style.minWidth = rect.width + 'px';

        // Check if dropdown goes off screen right
        requestAnimationFrame(function () {
            var menuRect = menu.getBoundingClientRect();
            if (menuRect.right > window.innerWidth - 12) {
                menu.style.left = (window.innerWidth - menuRect.width - 12) + 'px';
            }
            if (menuRect.bottom > window.innerHeight - 12) {
                menu.style.top = (rect.top - menuRect.height - 6) + 'px';
            }
        });

        menu.classList.add('au-visible');
        _activeDropdown = menu;
    }

    function closeDropdown(menu) {
        menu.classList.remove('au-visible');
        if (_activeDropdown === menu) _activeDropdown = null;
    }

    /* ================================================================
     *  Tabs 标签页
     * ================================================================ */

    function initTabs() {
        $$('[au-tabs]').forEach(function (container) {
            var tabs = $$('.au-tab, .au-pill-tab', container);
            var panels = $$('.au-tab-panel', container);

            tabs.forEach(function (tab) {
                tab.addEventListener('click', function () {
                    var target = tab.getAttribute('au-tabs');
                    tabs.forEach(function (t) { t.classList.remove('au-active'); });
                    tab.classList.add('au-active');
                    panels.forEach(function (p) {
                        p.classList.toggle('au-active', p.getAttribute('au-tab-panel') === target);
                    });
                });
            });
        });
    }

    /* ================================================================
     *  Accordion 手风琴
     * ================================================================ */

    function initAccordions() {
        document.addEventListener('click', function (e) {
            var header = e.target.closest('.au-accordion-header');
            if (!header) return;

            var item = header.closest('.au-accordion-item');
            if (!item) return;

            var group = item.closest('.au-accordion');
            if (!group) return;

            var isMultiple = group.hasAttribute('au-multiple');
            var isOpen = item.classList.contains('au-open');

            if (!isMultiple && !isOpen) {
                // Close all siblings
                $$('.au-accordion-item.au-open', group).forEach(function (sibling) {
                    closeAccordionItem(sibling);
                });
            }

            if (isOpen) {
                closeAccordionItem(item);
            } else {
                openAccordionItem(item);
            }
        });
    }

    function openAccordionItem(item) {
        item.classList.add('au-open');
        var body = $('.au-accordion-body', item);
        if (body) {
            body.style.maxHeight = body.scrollHeight + 'px';
        }
    }

    function closeAccordionItem(item) {
        var body = $('.au-accordion-body', item);
        if (body) {
            body.style.maxHeight = body.scrollHeight + 'px';
            requestAnimationFrame(function () {
                body.style.maxHeight = '0';
            });
        }
        item.classList.remove('au-open');
    }

    /* ================================================================
     *  Tooltip 工具提示
     * ================================================================ */

    var _tooltipEl = null;
    var _tooltipTimer = null;

    function initTooltips() {
        document.addEventListener('mouseenter', function (e) {
            var target = e.target.closest && e.target.closest('[au-tooltip]');
            if (!target) return;
            showTooltip(target);
        }, true);

        document.addEventListener('mouseleave', function (e) {
            var target = e.target.closest && e.target.closest('[au-tooltip]');
            if (!target) return;
            hideTooltip();
        }, true);
    }

    function showTooltip(target) {
        clearTimeout(_tooltipTimer);
        hideTooltip();

        var text = target.getAttribute('au-tooltip');
        if (!text) return;

        _tooltipEl = el('div', { class: 'au-tooltip-popup' }, text);
        document.body.appendChild(_tooltipEl);

        var rect = target.getBoundingClientRect();
        var tipRect = _tooltipEl.getBoundingClientRect();

        var top = rect.top - tipRect.height - 8;
        var left = rect.left + (rect.width - tipRect.width) / 2;

        // Keep in viewport
        if (top < 8) top = rect.bottom + 8;
        if (left < 8) left = 8;
        if (left + tipRect.width > window.innerWidth - 8) left = window.innerWidth - tipRect.width - 8;

        _tooltipEl.style.top = top + 'px';
        _tooltipEl.style.left = left + 'px';

        requestAnimationFrame(function () {
            _tooltipEl.classList.add('au-visible');
        });
    }

    function hideTooltip() {
        if (_tooltipEl) {
            var old = _tooltipEl;
            old.classList.remove('au-visible');
            onTransitionEnd(old, function () {
                if (old.parentNode) old.parentNode.removeChild(old);
            });
            _tooltipEl = null;
        }
    }

    /* ================================================================
     *  Alert 警告条
     * ================================================================ */

    function initAlerts() {
        document.addEventListener('click', function (e) {
            var closeBtn = e.target.closest('.au-alert-close');
            if (!closeBtn) return;
            var alert = closeBtn.closest('.au-alert');
            if (!alert) return;
            alert.classList.add('au-leaving');
            onTransitionEnd(alert, function () {
                if (alert.parentNode) alert.parentNode.removeChild(alert);
            });
        });
    }

    /* ================================================================
     *  Switch 开关
     * ================================================================ */

    function initSwitches() {
        document.addEventListener('click', function (e) {
            var sw = e.target.closest('.au-switch');
            if (!sw) return;
            sw.classList.toggle('au-checked');
            // Trigger change event
            var evt = new CustomEvent('change', { detail: { checked: sw.classList.contains('au-checked') } });
            sw.dispatchEvent(evt);
        });
    }

    /* ================================================================
     *  Progress 进度条动画
     * ================================================================ */

    function setProgress(bar, value) {
        if (typeof bar === 'string') bar = document.getElementById(bar);
        if (!bar) return;
        value = Math.max(0, Math.min(100, value));
        bar.style.width = value + '%';
        bar.setAttribute('aria-valuenow', value);
    }

    /* ================================================================
     *  Ripple 点击波纹效果
     * ================================================================ */

    function initRipple() {
        document.addEventListener('mousedown', function (e) {
            var target = e.target.closest('.au-ripple');
            if (!target) return;

            var rect = target.getBoundingClientRect();
            var size = Math.max(rect.width, rect.height);
            var x = e.clientX - rect.left - size / 2;
            var y = e.clientY - rect.top - size / 2;

            var ripple = el('span', {
                class: 'au-ripple-effect',
                style: 'width:' + size + 'px;height:' + size + 'px;left:' + x + 'px;top:' + y + 'px;'
            });
            target.appendChild(ripple);

            setTimeout(function () {
                if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
            }, 600);
        });
    }

    /* ================================================================
     *  Input 增强
     * ================================================================ */

    function initInputs() {
        // Auto-grow textarea
        document.addEventListener('input', function (e) {
            if (e.target.matches('.au-textarea--auto')) {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
            }
        });

        // Search clear
        document.addEventListener('click', function (e) {
            var clearBtn = e.target.closest('.au-search-clear');
            if (!clearBtn) return;
            var wrapper = clearBtn.closest('.au-input-wrapper');
            if (!wrapper) return;
            var input = $('input', wrapper);
            if (input) {
                input.value = '';
                input.focus();
                input.dispatchEvent(new Event('input'));
            }
        });
    }

    /* ================================================================
     *  暗色模式切换
     * ================================================================ */

    var _darkMode = false;

    function toggleDark(force) {
        _darkMode = typeof force === 'boolean' ? force : !_darkMode;
        document.documentElement.classList.toggle('au-dark', _darkMode);
        return _darkMode;
    }

    function isDark() { return _darkMode; }

    /* ================================================================
     *  全局初始化
     * ================================================================ */

    function init() {
        initDropdowns();
        initTabs();
        initAccordions();
        initTooltips();
        initAlerts();
        initSwitches();
        initRipple();
        initInputs();
    }

    // Auto init on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /* ================================================================
     *  公开 API
     * ================================================================ */

    var AU = {
        // 弹窗
        modal: modal,
        confirm: confirm,

        // 轻提示
        toast: toast,

        // 下拉菜单
        openDropdown: openDropdown,
        closeDropdown: closeDropdown,

        // 进度条
        setProgress: setProgress,

        // 暗色模式
        toggleDark: toggleDark,
        isDark: isDark,

        // 手动初始化（动态加载内容后）
        init: init,

        // 工具
        $: $,
        $$: $$,
        el: el
    };

    global.AU = AU;
    global.ApolloUI = AU;

})(typeof window !== 'undefined' ? window : this);