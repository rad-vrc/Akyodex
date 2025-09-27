(function (global) {
    'use strict';

    const defaultDependencies = {
        notify: (message, type = 'info', options) => {
            if (message) {
                const level = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'info';
                console[level](`[attributeManager] ${message}`);
            }
        },
        confirmDelete: () => true,
        getCurrentRole: () => null,
        canDelete: (meta, role) => role === 'owner' || (meta ? !!meta.isSession : false),
        onDelete: async () => true,
        onAttributesChanged: () => {},
        buildDeleteMessage: ({ name }) => `属性「${name}」を削除しますか？\n\n※ この属性を持つAkyoからも削除されます`,
    };

    const nameCollator = typeof Intl !== 'undefined' && Intl.Collator
        ? new Intl.Collator('ja')
        : null;

    const toLocaleLower = (value) => {
        return typeof value === 'string' ? value.toLocaleLowerCase('ja') : '';
    };

    function createAttributeManagerInstance() {
        const FALLBACK_ATTRIBUTE_NAME = '未分類';

        const dependencies = { ...defaultDependencies };

        const state = {
            attributes: new Map([
                [
                    FALLBACK_ATTRIBUTE_NAME,
                    { name: FALLBACK_ATTRIBUTE_NAME, isSession: false, searchKey: toLocaleLower(FALLBACK_ATTRIBUTE_NAME) },
                ],
            ]),
            fields: new Map(),
            modalSelection: [],
            activeFieldId: null,
            searchQuery: '',
            isInitialized: false,
            lastTriggerButton: null,
            dom: {
                modal: null,
                overlay: null,
                closeButtons: [],
                searchInput: null,
                grid: null,
                emptyMessage: null,
                applyButton: null,
                createStart: null,
                createForm: null,
                createInput: null,
                createConfirm: null,
                createCancel: null,
                scrollRegion: null,
            },
            currentEditFieldId: null,
            sortedCache: [],
            isCacheDirty: true,
            optionRefs: new Map(),
        };

        const createMeta = (name, props = {}) => ({
            ...props,
            name,
            searchKey: toLocaleLower(name),
        });

        const markAttributesDirty = () => {
            state.isCacheDirty = true;
        };

        const getSortedAttributes = () => {
            if (!state.isCacheDirty) {
                return state.sortedCache;
            }
            const entries = Array.from(state.attributes.values());
            if (nameCollator) {
                entries.sort((a, b) => nameCollator.compare(a.name, b.name));
            } else {
                entries.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
            }
            state.sortedCache = entries;
            state.isCacheDirty = false;
            return state.sortedCache;
        };

        const normalizeName = (name) => (typeof name === 'string' ? name.replace(/\s+/g, ' ').trim() : '');

        const parseAttributeString = (value) => {
            if (!value) return [];
            const seen = new Set();
            return String(value)
                .split(',')
                .map(part => normalizeName(part))
                .filter((part) => {
                    if (!part || seen.has(part)) {
                        return false;
                    }
                    seen.add(part);
                    return true;
                });
        };

        const getFallbackAttributeName = () => {
            return state.attributes.has(FALLBACK_ATTRIBUTE_NAME) ? FALLBACK_ATTRIBUTE_NAME : null;
        };

        const ensureFallbackSelection = (selection) => {
            if (!Array.isArray(selection)) {
                return false;
            }

            const fallbackName = getFallbackAttributeName();
            if (!fallbackName) {
                return false;
            }

            const fallbackIndex = selection.indexOf(fallbackName);

            if (selection.length === 0) {
                selection.push(fallbackName);
                return true;
            }

            if (fallbackIndex !== -1 && selection.length > 1) {
                selection.splice(fallbackIndex, 1);
                return true;
            }

            return false;
        };

        const addToOrderedSelection = (selection, value) => {
            if (!selection.includes(value)) {
                selection.push(value);
            }
        };

        const removeFromOrderedSelection = (selection, value) => {
            const index = selection.indexOf(value);
            if (index !== -1) {
                selection.splice(index, 1);
            }
        };

        function configure(overrides = {}) {
            if (!overrides || typeof overrides !== 'object') {
                return api;
            }

            if (typeof overrides.notify === 'function') {
                dependencies.notify = overrides.notify;
            }
            if (typeof overrides.confirmDelete === 'function') {
                dependencies.confirmDelete = overrides.confirmDelete;
            }
            if (typeof overrides.getCurrentRole === 'function') {
                dependencies.getCurrentRole = overrides.getCurrentRole;
            }
            if (typeof overrides.canDelete === 'function') {
                dependencies.canDelete = overrides.canDelete;
            }
            if (typeof overrides.onDelete === 'function') {
                dependencies.onDelete = overrides.onDelete;
            }
            if (typeof overrides.onAttributesChanged === 'function') {
                dependencies.onAttributesChanged = overrides.onAttributesChanged;
            }
            if (typeof overrides.buildDeleteMessage === 'function') {
                dependencies.buildDeleteMessage = overrides.buildDeleteMessage;
            }

            return api;
        }

        function registerBaseField() {
            const hiddenInput = document.getElementById('addAttributeInput');
            const badgeContainer = document.getElementById('addAttributeList');
            const placeholder = document.getElementById('addAttributePlaceholder');
            const button = document.querySelector('[data-attribute-target="add"]');
            if (hiddenInput && badgeContainer && placeholder && button) {
                registerField('add', { hiddenInput, badgeContainer, placeholder, button }, { initialValue: hiddenInput.value });
            }
        }

        function ensureDomReferences() {
            if (state.isInitialized) {
                return true;
            }

            const modal = document.getElementById('attributeModal');
            if (!modal) {
                console.warn('[attributeManager] attributeModal not found; attribute features disabled');
                return false;
            }

            state.dom.modal = modal;
            state.dom.modal.setAttribute('aria-hidden', 'true');
            state.dom.overlay = modal.querySelector('[data-attribute-overlay]');
            state.dom.closeButtons = Array.from(modal.querySelectorAll('[data-attribute-close]'));
            state.dom.searchInput = document.getElementById('attributeSearchInput');
            state.dom.grid = document.getElementById('attributeListGrid');
            state.dom.emptyMessage = document.getElementById('attributeEmptyMessage');
            state.dom.applyButton = document.getElementById('attributeApplyButton');
            state.dom.createStart = document.getElementById('attributeCreateStart');
            state.dom.createForm = document.getElementById('attributeCreateForm');
            state.dom.createInput = document.getElementById('attributeNewInput');
            state.dom.createConfirm = document.getElementById('attributeCreateConfirm');
            state.dom.createCancel = document.getElementById('attributeCreateCancel');
            state.dom.scrollRegion = document.getElementById('attributeListScroll');

            return true;
        }

        function bindModalEvents() {
            if (!ensureDomReferences()) {
                return;
            }

            if (state.dom.overlay) {
                state.dom.overlay.addEventListener('click', closeModal);
            }
            state.dom.closeButtons.forEach((button) => {
                button.addEventListener('click', closeModal);
            });
            if (state.dom.applyButton) {
                state.dom.applyButton.addEventListener('click', applySelection);
            }
            if (state.dom.searchInput) {
                state.dom.searchInput.addEventListener('input', handleSearchInput);
            }
            if (state.dom.createStart) {
                state.dom.createStart.addEventListener('click', () => toggleCreateForm(true));
            }
            if (state.dom.createCancel) {
                state.dom.createCancel.addEventListener('click', () => toggleCreateForm(false));
            }
            if (state.dom.createConfirm) {
                state.dom.createConfirm.addEventListener('click', confirmCreateAttribute);
            }
            if (state.dom.createInput) {
                state.dom.createInput.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        confirmCreateAttribute();
                    }
                });
            }
            if (state.dom.grid) {
                state.dom.grid.addEventListener('click', handleGridClick);
            }

            state.isInitialized = true;
        }

        function init() {
            if (!ensureDomReferences()) {
                return;
            }

            if (!state.isInitialized) {
                bindModalEvents();
            }

            registerBaseField();
        }

        function registerField(fieldId, elements, { initialValue } = {}) {
            if (!elements || !elements.hiddenInput || !elements.badgeContainer || !elements.placeholder) {
                return;
            }

            const id = String(fieldId);
            unregisterField(id);

            const field = {
                id,
                hiddenInput: elements.hiddenInput,
                badgeContainer: elements.badgeContainer,
                placeholder: elements.placeholder,
                button: elements.button || null,
                buttonHandler: null,
                selected: [],
            };

            const initial = initialValue !== undefined ? initialValue : elements.hiddenInput.value;
            field.selected = parseAttributeString(initial);
            ensureFallbackSelection(field.selected);

            if (field.button) {
                field.buttonHandler = () => openModal(id);
                field.button.addEventListener('click', field.buttonHandler);
            }

            state.fields.set(id, field);
            syncFieldValue(id);
        }

        function unregisterField(fieldId) {
            const field = state.fields.get(fieldId);
            if (!field) return;

            if (field.button && field.buttonHandler) {
                field.button.removeEventListener('click', field.buttonHandler);
            }

            state.fields.delete(fieldId);
            if (state.currentEditFieldId === fieldId) {
                state.currentEditFieldId = null;
            }
        }

        function openModal(fieldId) {
            if (!state.isInitialized || !state.dom.modal) return;
            const field = state.fields.get(fieldId);
            if (!field) return;

            state.activeFieldId = fieldId;
            state.modalSelection = field.selected.slice();
            ensureFallbackSelection(state.modalSelection);
            state.searchQuery = '';
            state.lastTriggerButton = field.button || null;

            if (state.dom.searchInput) {
                state.dom.searchInput.value = '';
            }

            toggleCreateForm(false);
            renderModalList();
            state.dom.modal.classList.remove('hidden');
            state.dom.modal.setAttribute('aria-hidden', 'false');
            setTimeout(() => {
                if (state.dom.searchInput) {
                    state.dom.searchInput.focus();
                }
            }, 0);
        }

        function closeModal() {
            if (!state.dom.modal) return;
            state.dom.modal.classList.add('hidden');
            state.dom.modal.setAttribute('aria-hidden', 'true');
            state.activeFieldId = null;
            state.modalSelection = [];
            state.searchQuery = '';
            if (state.dom.searchInput) {
                state.dom.searchInput.value = '';
            }
            toggleCreateForm(false);
            if (state.lastTriggerButton) {
                const button = state.lastTriggerButton;
                state.lastTriggerButton = null;
                setTimeout(() => {
                    if (typeof button.focus === 'function') {
                        button.focus();
                    }
                }, 0);
            }
        }

        function handleSearchInput(event) {
            state.searchQuery = normalizeName(event.target.value || '');
            renderModalList();
        }

        function toggleCreateForm(show) {
            const form = state.dom.createForm;
            const startButton = state.dom.createStart;
            if (!form || !startButton) return;

            const expandedValue = show ? 'true' : 'false';
            startButton.setAttribute('aria-expanded', expandedValue);
            form.setAttribute('aria-hidden', show ? 'false' : 'true');

            if (show) {
                form.classList.remove('hidden');
                startButton.classList.add('hidden');
                if (state.dom.createInput) {
                    state.dom.createInput.value = '';
                    setTimeout(() => state.dom.createInput.focus(), 0);
                }
            } else {
                form.classList.add('hidden');
                startButton.classList.remove('hidden');
                if (state.dom.createInput) {
                    state.dom.createInput.value = '';
                }
            }
        }

        function confirmCreateAttribute() {
            if (!state.dom.createInput) return;
            const value = normalizeName(state.dom.createInput.value);
            if (!value) {
                dependencies.notify('属性名を入力してください', 'warning');
                return;
            }
            if (state.attributes.has(value)) {
                dependencies.notify(`属性「${value}」は既に存在します`, 'warning');
                state.dom.createInput.value = '';
                return;
            }

            state.attributes.set(value, createMeta(value, { isSession: true }));
            markAttributesDirty();
            addToOrderedSelection(state.modalSelection, value);
            ensureFallbackSelection(state.modalSelection);
            toggleCreateForm(false);
            renderModalList();
            dependencies.onAttributesChanged(Array.from(state.attributes.keys()));
            dependencies.notify(`属性「${value}」を追加しました`, 'success');
        }

        function handleGridClick(event) {
            const actionEl = event.target.closest('[data-attribute-action]');
            if (!actionEl) return;

            const { attributeName: rawName, attributeAction: action } = actionEl.dataset;
            if (!rawName) return;

            if (action === 'toggle') {
                toggleSelection(rawName, undefined, actionEl);
                return;
            }

            if (action === 'delete') {
                event.preventDefault();
                event.stopPropagation();
                void requestDeleteAttribute(rawName);
            }
        }

        function renderModalList() {
            if (!state.dom.grid) return;
            const scrollRegion = state.dom.scrollRegion;
            const scrollTop = scrollRegion ? scrollRegion.scrollTop : 0;

            const query = state.searchQuery ? toLocaleLower(state.searchQuery) : '';
            const baseList = getSortedAttributes();
            const items = query
                ? baseList.filter(meta => meta.searchKey.includes(query))
                : baseList;

            if (state.dom.emptyMessage) {
                if (items.length === 0) {
                    state.dom.emptyMessage.classList.remove('hidden');
                } else {
                    state.dom.emptyMessage.classList.add('hidden');
                }
            }

            const fragment = document.createDocumentFragment();
            const selectionSet = new Set(state.modalSelection);
            state.dom.grid.textContent = '';
            state.optionRefs = new Map();

            items.forEach((meta) => {
                const isSelected = selectionSet.has(meta.name);
                const row = document.createElement('div');
                row.className = 'flex items-center gap-2';

                const toggleBtn = document.createElement('button');
                toggleBtn.type = 'button';
                toggleBtn.dataset.attributeAction = 'toggle';
                toggleBtn.dataset.attributeName = meta.name;
                toggleBtn.className = `attribute-option flex-1 flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-colors ${isSelected ? 'attribute-option--active' : 'attribute-option--inactive'}`;
                toggleBtn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

                const left = document.createElement('span');
                left.className = 'flex items-center gap-3';

                const indicator = document.createElement('span');
                indicator.className = `attribute-option__indicator flex items-center justify-center w-6 h-6 rounded-full ${isSelected ? 'attribute-option__indicator--active' : 'attribute-option__indicator--inactive'}`;
                indicator.innerHTML = '<i class="fas fa-check text-xs"></i>';

                const text = document.createElement('span');
                text.className = 'text-sm font-medium text-gray-800';
                text.textContent = meta.name;

                left.appendChild(indicator);
                left.appendChild(text);

                if (meta.isSession) {
                    const chip = document.createElement('span');
                    chip.className = 'attribute-chip attribute-chip--session';
                    chip.textContent = '新規';
                    left.appendChild(chip);
                }

                toggleBtn.appendChild(left);
                row.appendChild(toggleBtn);
                state.optionRefs.set(meta.name, toggleBtn);

                const canDelete = dependencies.canDelete(meta, dependencies.getCurrentRole());
                if (canDelete) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.type = 'button';
                    deleteBtn.dataset.attributeAction = 'delete';
                    deleteBtn.dataset.attributeName = meta.name;
                    deleteBtn.className = 'text-sm text-gray-400 hover:text-red-500 transition-colors';
                    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                    row.appendChild(deleteBtn);
                } else {
                    const spacer = document.createElement('span');
                    spacer.className = 'w-4 h-4';
                    row.appendChild(spacer);
                }

                fragment.appendChild(row);
            });

            state.dom.grid.appendChild(fragment);

            if (scrollRegion) {
                scrollRegion.scrollTop = scrollTop;
            }
        }

        function toggleSelection(name, forceState, sourceElement) {
            const normalized = normalizeName(name);
            if (!normalized) return;

            const currentlySelected = state.modalSelection.includes(normalized);
            const shouldSelect = typeof forceState === 'boolean' ? forceState : !currentlySelected;
            const fallbackName = getFallbackAttributeName();
            const fallbackWasSelected = fallbackName ? state.modalSelection.includes(fallbackName) : false;

            if (shouldSelect && !currentlySelected) {
                addToOrderedSelection(state.modalSelection, normalized);
            } else if (!shouldSelect && currentlySelected) {
                removeFromOrderedSelection(state.modalSelection, normalized);
            }

            ensureFallbackSelection(state.modalSelection);

            updateModalOptionState(normalized, sourceElement);

            if (fallbackName) {
                const fallbackIsSelected = state.modalSelection.includes(fallbackName);
                if (fallbackWasSelected !== fallbackIsSelected || normalized === fallbackName) {
                    updateModalOptionState(fallbackName);
                }
            }
        }

        function applySelection() {
            if (!state.activeFieldId) {
                closeModal();
                return;
            }

            const field = state.fields.get(state.activeFieldId);
            if (!field) {
                closeModal();
                return;
            }

            ensureFallbackSelection(state.modalSelection);
            field.selected = state.modalSelection.slice();
            syncFieldValue(state.activeFieldId);
            closeModal();
        }

        async function requestDeleteAttribute(name) {
            const normalized = normalizeName(name);
            if (!normalized) return;

            const meta = state.attributes.get(normalized);
            if (!meta) return;

            const role = dependencies.getCurrentRole();
            const canDelete = dependencies.canDelete(meta, role);
            if (!canDelete) {
                dependencies.notify('この属性を削除する権限がありません', 'error');
                return;
            }

            const confirmationMessage = dependencies.buildDeleteMessage({ name: normalized, meta, role });
            if (confirmationMessage && dependencies.confirmDelete(confirmationMessage, { name: normalized, meta, role }) === false) {
                return;
            }

            let deleteResult;
            try {
                deleteResult = await dependencies.onDelete({ name: normalized, meta, role });
            } catch (error) {
                console.error('[attributeManager] onDelete callback failed', error);
                dependencies.notify('属性の削除処理でエラーが発生しました', 'error');
                return;
            }

            if (deleteResult === false) {
                return;
            }

            if (state.attributes.delete(normalized)) {
                markAttributesDirty();
            }
            removeFromOrderedSelection(state.modalSelection, normalized);
            ensureFallbackSelection(state.modalSelection);
            removeAttributeFromFields(normalized);
            renderModalList();
            dependencies.onAttributesChanged(Array.from(state.attributes.keys()));

            if (deleteResult && typeof deleteResult === 'object' && deleteResult.message) {
                dependencies.notify(deleteResult.message, deleteResult.type || 'success');
            } else {
                dependencies.notify(`属性「${normalized}」を削除しました`, 'success');
            }
        }

        function removeAttributeFromFields(name) {
            state.fields.forEach((field) => {
                if (field.selected.includes(name)) {
                    field.selected = field.selected.filter(attr => attr !== name);
                    ensureFallbackSelection(field.selected);
                    syncFieldValue(field.id);
                }
            });
        }

        function syncFieldValue(fieldId) {
            const field = state.fields.get(fieldId);
            if (!field) return;

            const value = field.selected.join(',');
            field.hiddenInput.value = value;

            if (field.placeholder) {
                if (field.selected.length === 0) {
                    field.placeholder.classList.remove('hidden');
                } else {
                    field.placeholder.classList.add('hidden');
                }
            }

            if (field.badgeContainer) {
                field.badgeContainer.textContent = '';
                if (field.selected.length === 0) {
                    field.badgeContainer.classList.add('hidden');
                } else {
                    field.badgeContainer.classList.remove('hidden');
                    const fragment = document.createDocumentFragment();
                    field.selected.forEach((attr) => {
                        const badge = document.createElement('span');
                        badge.className = 'attribute-badge inline-flex items-center gap-1 text-xs font-semibold shadow-sm';
                        badge.textContent = attr;
                        fragment.appendChild(badge);
                    });
                    field.badgeContainer.appendChild(fragment);
                }
            }
        }

        function rebuildFromAkyoData(list) {
            if (!Array.isArray(list)) return;

            const seen = new Set();
            list.forEach((akyo) => {
                parseAttributeString(akyo?.attribute).forEach((attr) => {
                    seen.add(attr);

                    const existingMeta = state.attributes.get(attr);
                    if (existingMeta) {
                        if (existingMeta.isSession) {
                            const updatedMeta = createMeta(attr, { ...existingMeta, isSession: false });
                            state.attributes.set(attr, updatedMeta);
                            markAttributesDirty();
                        }
                    } else {
                        state.attributes.set(attr, createMeta(attr, { isSession: false }));
                        markAttributesDirty();
                    }
                });
            });

            Array.from(state.attributes.entries()).forEach(([name, meta]) => {
                if (!meta) return;
                const shouldKeep = meta.isSession || seen.has(name) || name === FALLBACK_ATTRIBUTE_NAME;
                if (!shouldKeep) {
                    if (state.attributes.delete(name)) {
                        markAttributesDirty();
                    }
                    removeAttributeFromFields(name);
                }
            });

            if (!state.attributes.has(FALLBACK_ATTRIBUTE_NAME)) {
                state.attributes.set(
                    FALLBACK_ATTRIBUTE_NAME,
                    createMeta(FALLBACK_ATTRIBUTE_NAME, { isSession: false })
                );
                markAttributesDirty();
            } else {
                const fallbackMeta = state.attributes.get(FALLBACK_ATTRIBUTE_NAME);
                if (fallbackMeta && fallbackMeta.isSession) {
                    state.attributes.set(
                        FALLBACK_ATTRIBUTE_NAME,
                        createMeta(FALLBACK_ATTRIBUTE_NAME, { ...fallbackMeta, isSession: false })
                    );
                    markAttributesDirty();
                }
            }

            if (state.activeFieldId) {
                renderModalList();
            }

            dependencies.onAttributesChanged(Array.from(state.attributes.keys()));
        }

        function resetField(fieldId) {
            const field = state.fields.get(fieldId);
            if (!field) return;
            field.selected = [];
            ensureFallbackSelection(field.selected);
            syncFieldValue(fieldId);
        }

        function hasSelection(fieldId) {
            const field = state.fields.get(fieldId);
            return !!(field && field.selected.length > 0);
        }

        function getValue(fieldId) {
            const field = state.fields.get(fieldId);
            return field ? field.selected.join(',') : '';
        }

        function setCurrentEditField(fieldId) {
            state.currentEditFieldId = fieldId;
        }

        function clearCurrentEditField() {
            if (state.currentEditFieldId) {
                unregisterField(state.currentEditFieldId);
                state.currentEditFieldId = null;
            }
        }

        function ensureFieldSync(fieldId, attributeString) {
            const field = state.fields.get(fieldId);
            if (!field) return;
            field.selected = parseAttributeString(attributeString);
            ensureFallbackSelection(field.selected);
            syncFieldValue(fieldId);
        }

        function isModalOpen() {
            return !!(state.dom.modal && !state.dom.modal.classList.contains('hidden'));
        }

        function updateModalOptionState(name, sourceElement) {
            const normalized = normalizeName(name);
            if (!normalized || !state.dom.grid) {
                return;
            }

            let targetButton = null;
            if (sourceElement && sourceElement.dataset && sourceElement.dataset.attributeName === normalized) {
                targetButton = sourceElement;
            } else {
                targetButton = state.optionRefs.get(normalized) || null;
            }

            if (!targetButton) {
                return;
            }

            const isSelected = state.modalSelection.includes(normalized);
            targetButton.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
            targetButton.classList.toggle('attribute-option--active', isSelected);
            targetButton.classList.toggle('attribute-option--inactive', !isSelected);

            const indicator = targetButton.querySelector('.attribute-option__indicator');
            if (indicator) {
                indicator.classList.toggle('attribute-option__indicator--active', isSelected);
                indicator.classList.toggle('attribute-option__indicator--inactive', !isSelected);
            }
        }

        const api = {
            configure,
            init,
            registerField,
            unregisterField,
            rebuildFromAkyoData,
            resetField,
            hasSelection,
            getValue,
            setCurrentEditField,
            clearCurrentEditField,
            ensureFieldSync,
            isModalOpen,
            closeModal,
            parseAttributeString,
            get currentEditFieldId() {
                return state.currentEditFieldId;
            }
        };

        return api;
    }

    const manager = createAttributeManagerInstance();

    try {
        Object.defineProperty(global, 'attributeManager', { value: manager, configurable: false, writable: false });
    } catch (error) {
        console.warn('[attributeManager] Unable to define read-only global, falling back to direct assignment', error);
        global.attributeManager = manager;
    }
})(typeof window !== 'undefined' ? window : globalThis);
