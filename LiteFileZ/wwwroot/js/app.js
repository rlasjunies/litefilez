class FileManager {
    constructor() {
        this.currentTab = null;
        this.currentPath = null;
        this.selectedItem = null;
        this.tabs = [];
        this.init();
    }

    async init() {
        await this.loadConfiguration();
        this.setupEventListeners();
        this.renderTabs();
        if (this.tabs.length > 0) {
            // Get the first tab element and switch to it
            const firstTabElement = document.querySelector('.tab.active');
            await this.switchTab(this.tabs[0], firstTabElement);
        }
    }

    async loadConfiguration() {
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            this.tabs = config.tabs;
        } catch (error) {
            console.error('Failed to load configuration:', error);
            this.showError('Failed to load configuration');
        }
    }

    setupEventListeners() {
        document.getElementById('settings-btn').addEventListener('click', () => this.openConfigModal());
        
        document.querySelector('.close').addEventListener('click', () => this.closeConfigModal());
        document.getElementById('save-config').addEventListener('click', () => this.saveConfiguration());
        document.getElementById('cancel-config').addEventListener('click', () => this.closeConfigModal());
        
        document.addEventListener('click', (e) => {
            if (e.target.id === 'config-modal') {
                this.closeConfigModal();
            }
        });

        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.file-item')) {
                e.preventDefault();
                this.showContextMenu(e, e.target.closest('.file-item'));
            }
        });

        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // Keyboard navigation for tree view
        document.addEventListener('keydown', (e) => {
            if (document.activeElement && document.activeElement.id === 'tree-view') {
                this.handleTreeKeyNavigation(e);
            } else if (document.activeElement && document.activeElement.id === 'file-list') {
                this.handleFileListKeyNavigation(e);
            } else if (document.activeElement && document.activeElement.id === 'tabs-container') {
                this.handleTabsKeyNavigation(e);
            }
        });

        // Focus containers when clicking on them
        document.addEventListener('click', (e) => {
            if (e.target.closest('#tree-view')) {
                document.getElementById('tree-view').focus();
            } else if (e.target.closest('#file-list')) {
                document.getElementById('file-list').focus();
            } else if (e.target.closest('#tabs-container')) {
                document.getElementById('tabs-container').focus();
            }
        });
    }

    renderTabs() {
        const container = document.getElementById('tabs-container');
        container.innerHTML = '';
        
        if (!this.tabs || this.tabs.length === 0) {
            container.innerHTML = '<div style="color: white; padding: 15px;">No tabs configured</div>';
            return;
        }
        
        this.tabs.forEach((tab, index) => {
            const tabElement = document.createElement('button');
            tabElement.className = 'tab';
            tabElement.innerHTML = `${tab.icon} ${tab.name}`;
            tabElement.addEventListener('click', () => this.switchTab(tab, tabElement));
            
            // Mark first tab as active
            if (index === 0) {
                tabElement.classList.add('active');
            }
            
            container.appendChild(tabElement);
        });
    }

    async switchTab(tab, tabElement) {
        this.currentTab = tab;
        this.currentPath = tab.path;
        this.selectedItem = null;
        
        // Update active tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        if (tabElement) {
            tabElement.classList.add('active');
        }
        
        // Clear details panel
        document.getElementById('item-details').innerHTML = 'Select an item to view details';
        
        await this.loadPath(tab.path);
        await this.loadTreeView(tab.path);
    }

    async loadPath(path) {
        try {
            document.getElementById('file-list').innerHTML = '<div class="loading">Loading...</div>';
            
            const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
            const data = await response.json();
            
            if (data.error) {
                document.getElementById('file-list').innerHTML = `<div class="error">Error: ${data.error}</div>`;
                return;
            }
            
            this.renderFileList(data.items);
            this.currentPath = path;
        } catch (error) {
            console.error('Failed to load path:', error);
            document.getElementById('file-list').innerHTML = `<div class="error">Failed to load path: ${error.message}</div>`;
        }
    }

    renderFileList(items) {
        const container = document.getElementById('file-list');
        container.innerHTML = '';
        
        items.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
        
        items.forEach(item => {
            const element = document.createElement('div');
            element.className = 'file-item';
            element.dataset.path = item.path;
            element.dataset.isDirectory = item.isDirectory;
            element.itemData = item; // Store complete item data
            
            const icon = this.getFileIcon(item);
            const size = item.isDirectory ? '' : this.formatFileSize(item.size);
            const date = new Date(item.lastModified).toLocaleString();
            
            element.innerHTML = `
                <span class="icon">${icon}</span>
                <span class="name" title="${item.name}">${item.name}</span>
                <span class="date">${date}</span>
                <span class="size">${size}</span>
                <div class="actions">
                    <button class="action-btn" data-action="rename">✏️</button>
                    <button class="action-btn" data-action="delete">🗑️</button>
                    <button class="action-btn" data-action="copy">📋</button>
                </div>
            `;
            
            element.addEventListener('click', () => this.selectItem(element, item));
            element.addEventListener('dblclick', () => this.openItem(item));
            
            container.appendChild(element);
        });
    }

    async loadTreeView(rootPath) {
        try {
            const response = await fetch(`/api/files/tree?path=${encodeURIComponent(rootPath)}`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            this.renderTreeView(data.items, rootPath);
        } catch (error) {
            console.error('Failed to load tree view:', error);
            document.getElementById('tree-view').innerHTML = '<div class="error">Failed to load tree</div>';
        }
    }

    renderTreeView(items, rootPath, level = 0) {
        const container = document.getElementById('tree-view');
        
        if (level === 0) {
            container.innerHTML = '';
            this.treeData = new Map(); // Store tree structure
        }
        
        if (level === 0) {
            const rootElement = document.createElement('div');
            rootElement.className = 'tree-item selected';
            rootElement.dataset.path = rootPath;
            rootElement.dataset.level = '0';
            rootElement.dataset.expanded = 'true';
            const rootName = this.getPathName(rootPath);
            rootElement.innerHTML = `
                <span class="expand-icon">📂</span>
                <span class="folder-name" title="${rootName}">${rootName}</span>
            `;
            rootElement.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Check if the expand icon was clicked
                if (e.target.classList.contains('expand-icon')) {
                    await this.toggleTreeNode(rootElement, rootPath);
                } else {
                    this.selectTreeItem(rootElement);
                    await this.loadPath(rootPath);
                }
            });
            container.appendChild(rootElement);
        }
        
        items.filter(item => item.isDirectory).forEach(item => {
            const element = document.createElement('div');
            element.className = 'tree-item';
            element.dataset.path = item.path;
            element.dataset.level = level + 1;
            element.dataset.expanded = 'false';
            element.style.paddingLeft = `${20 + (level * 20)}px`;
            element.innerHTML = `
                <span class="expand-icon">📁</span>
                <span class="folder-name" title="${item.name}">${item.name}</span>
            `;
            
            element.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Tree item clicked:', item.name, 'target:', e.target.className);
                
                // Check if the expand icon was clicked
                if (e.target.classList.contains('expand-icon')) {
                    console.log('Expand icon clicked for:', item.name);
                    await this.toggleTreeNode(element, item.path);
                } else {
                    console.log('Folder name clicked for:', item.name);
                    this.selectTreeItem(element);
                    await this.loadPath(item.path);
                }
            });
            
            container.appendChild(element);
        });
    }

    async toggleTreeNode(element, path) {
        console.log('Toggling tree node:', path);
        const isExpanded = element.dataset.expanded === 'true';
        const level = parseInt(element.dataset.level);
        console.log('Current state - expanded:', isExpanded, 'level:', level);
        
        if (isExpanded) {
            // Collapse: remove child nodes
            console.log('Collapsing node');
            this.collapseTreeNode(element);
        } else {
            // Expand: load and show child nodes
            console.log('Expanding node');
            await this.expandTreeNode(element, path, level);
        }
    }

    collapseTreeNode(element) {
        const level = parseInt(element.dataset.level);
        const expandIcon = element.querySelector('.expand-icon');
        
        // Update element state
        element.dataset.expanded = 'false';
        expandIcon.textContent = '📁';
        
        // Remove all child nodes (nodes with higher level that come after this element)
        let nextElement = element.nextElementSibling;
        while (nextElement && parseInt(nextElement.dataset.level) > level) {
            const toRemove = nextElement;
            nextElement = nextElement.nextElementSibling;
            toRemove.remove();
        }
    }

    async expandTreeNode(element, path, level) {
        try {
            console.log('Fetching tree data for path:', path);
            const response = await fetch(`/api/files/tree?path=${encodeURIComponent(path)}`);
            const data = await response.json();
            console.log('Tree data received:', data);
            
            if (data.error) {
                console.error('Failed to load tree children:', data.error);
                return;
            }

            const expandIcon = element.querySelector('.expand-icon');
            element.dataset.expanded = 'true';
            expandIcon.textContent = '📂';

            // Insert child nodes after this element
            const childFolders = data.items.filter(item => item.isDirectory);
            console.log('Child folders found:', childFolders.length);
            
            for (let i = childFolders.length - 1; i >= 0; i--) {
                const item = childFolders[i];
                const childElement = document.createElement('div');
                childElement.className = 'tree-item';
                childElement.dataset.path = item.path;
                childElement.dataset.level = level + 1;
                childElement.dataset.expanded = 'false';
                childElement.style.paddingLeft = `${20 + (level + 1) * 20}px`;
                childElement.innerHTML = `
                    <span class="expand-icon">📁</span>
                    <span class="folder-name" title="${item.name}">${item.name}</span>
                `;
                
                childElement.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Check if the expand icon was clicked
                    if (e.target.classList.contains('expand-icon')) {
                        await this.toggleTreeNode(childElement, item.path);
                    } else {
                        this.selectTreeItem(childElement);
                        await this.loadPath(item.path);
                    }
                });
                
                // Insert after the parent element
                element.parentNode.insertBefore(childElement, element.nextSibling);
            }
        } catch (error) {
            console.error('Failed to expand tree node:', error);
        }
    }

    selectTreeItem(selectedElement) {
        document.querySelectorAll('.tree-item').forEach(item => item.classList.remove('selected'));
        selectedElement.classList.add('selected');
    }

    handleTreeKeyNavigation(e) {
        const currentSelected = document.querySelector('.tree-item.selected');
        if (!currentSelected) return;

        const allTreeItems = Array.from(document.querySelectorAll('.tree-item'));
        const currentIndex = allTreeItems.indexOf(currentSelected);

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    this.selectTreeItem(allTreeItems[currentIndex - 1]);
                    allTreeItems[currentIndex - 1].scrollIntoView({ block: 'nearest' });
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < allTreeItems.length - 1) {
                    this.selectTreeItem(allTreeItems[currentIndex + 1]);
                    allTreeItems[currentIndex + 1].scrollIntoView({ block: 'nearest' });
                }
                break;

            case 'ArrowRight':
                e.preventDefault();
                if (currentSelected.dataset.expanded === 'false') {
                    this.toggleTreeNode(currentSelected, currentSelected.dataset.path);
                }
                break;

            case 'ArrowLeft':
                e.preventDefault();
                if (currentSelected.dataset.expanded === 'true') {
                    this.toggleTreeNode(currentSelected, currentSelected.dataset.path);
                }
                break;

            case 'Enter':
                e.preventDefault();
                this.loadPath(currentSelected.dataset.path);
                break;
        }
    }

    handleFileListKeyNavigation(e) {
        const currentSelected = document.querySelector('.file-item.selected');
        const allFileItems = Array.from(document.querySelectorAll('.file-item'));
        
        // If no item is selected, select the first one
        if (!currentSelected && allFileItems.length > 0) {
            const firstItem = allFileItems[0];
            this.selectItem(firstItem, firstItem.itemData);
            return;
        }
        
        if (!currentSelected) return;

        const currentIndex = allFileItems.indexOf(currentSelected);

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    const prevItem = allFileItems[currentIndex - 1];
                    this.selectItem(prevItem, prevItem.itemData);
                    prevItem.scrollIntoView({ block: 'nearest' });
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < allFileItems.length - 1) {
                    const nextItem = allFileItems[currentIndex + 1];
                    this.selectItem(nextItem, nextItem.itemData);
                    nextItem.scrollIntoView({ block: 'nearest' });
                }
                break;

            case 'ArrowLeft':
                e.preventDefault();
                this.navigateToParent();
                break;

            case 'Enter':
                e.preventDefault();
                this.openItem(currentSelected.itemData);
                break;
        }
    }

    navigateToParent() {
        if (!this.currentPath) return;
        
        // Get parent directory path
        const pathSeparator = this.currentPath.includes('/') ? '/' : '\\';
        const pathParts = this.currentPath.split(pathSeparator);
        
        // Don't go above root level
        if (pathParts.length <= 1 || (pathParts.length === 2 && pathParts[1] === '')) {
            return;
        }
        
        // Remove last part to get parent path
        pathParts.pop();
        const parentPath = pathParts.join(pathSeparator);
        
        // Ensure we don't get empty path
        const finalParentPath = parentPath || (pathSeparator === '\\' ? 'C:\\' : '/');
        
        // Navigate to parent
        this.loadPath(finalParentPath);
        this.updateTreeViewSelection(finalParentPath);
    }

    handleTabsKeyNavigation(e) {
        const currentActiveTab = document.querySelector('.tab.active');
        const allTabs = Array.from(document.querySelectorAll('.tab'));
        
        if (!currentActiveTab || allTabs.length === 0) return;

        const currentIndex = allTabs.indexOf(currentActiveTab);

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                if (currentIndex > 0) {
                    const prevTab = allTabs[currentIndex - 1];
                    const tabData = this.tabs[currentIndex - 1];
                    this.switchTab(tabData, prevTab);
                    prevTab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }
                break;

            case 'ArrowRight':
                e.preventDefault();
                if (currentIndex < allTabs.length - 1) {
                    const nextTab = allTabs[currentIndex + 1];
                    const tabData = this.tabs[currentIndex + 1];
                    this.switchTab(tabData, nextTab);
                    nextTab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }
                break;

            case 'Enter':
                e.preventDefault();
                // Enter just refocuses the current tab (already selected)
                const tabData = this.tabs[currentIndex];
                this.switchTab(tabData, currentActiveTab);
                break;
        }
    }

    selectItem(element, item) {
        document.querySelectorAll('.file-item').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
        this.selectedItem = item;
        this.showItemDetails(item);
    }

    async openItem(item) {
        if (item.isDirectory) {
            await this.loadPath(item.path);
            await this.updateTreeViewSelection(item.path);
        } else {
            try {
                await fetch(`/api/files/open?path=${encodeURIComponent(item.path)}`, { method: 'POST' });
            } catch (error) {
                console.error('Failed to open file:', error);
                this.showError('Failed to open file');
            }
        }
    }

    async updateTreeViewSelection(path) {
        // Find the tree item with matching path and select it
        const treeItems = document.querySelectorAll('.tree-item');
        let found = false;
        
        for (const item of treeItems) {
            if (item.dataset.path === path) {
                this.selectTreeItem(item);
                found = true;
                break;
            }
        }
        
        // If not found in current tree, we may need to expand parent folders
        if (!found) {
            await this.expandTreeToPath(path);
        }
    }

    async expandTreeToPath(targetPath) {
        // For now, just reload the tree from root
        // A more sophisticated implementation would expand the path step by step
        await this.loadTreeView(this.currentTab.path);
    }

    showItemDetails(item) {
        const container = document.getElementById('item-details');
        const details = [
            { label: 'Name', value: item.name },
            { label: 'Type', value: item.isDirectory ? 'Folder' : 'File' },
            { label: 'Path', value: item.path },
            { label: 'Size', value: item.isDirectory ? '-' : this.formatFileSize(item.size) },
            { label: 'Modified', value: new Date(item.lastModified).toLocaleString() },
            { label: 'Created', value: new Date(item.created).toLocaleString() }
        ];
        
        container.innerHTML = details.map(detail => `
            <div class="detail-row">
                <span class="detail-label">${detail.label}:</span>
                <span class="detail-value">${detail.value}</span>
            </div>
        `).join('');
    }

    getFileIcon(item) {
        if (item.isDirectory) return '📁';
        
        const ext = item.name.split('.').pop().toLowerCase();
        const iconMap = {
            'txt': '📄', 'doc': '📄', 'docx': '📄', 'pdf': '📄',
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
            'mp3': '🎵', 'wav': '🎵', 'mp4': '🎬', 'avi': '🎬',
            'zip': '📦', 'rar': '📦', '7z': '📦',
            'exe': '⚙️', 'msi': '⚙️',
            'js': '📜', 'html': '📜', 'css': '📜', 'json': '📜'
        };
        
        return iconMap[ext] || '📄';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    getPathName(path) {
        return path.split('\\').pop() || path.split('/').pop() || path;
    }

    showContextMenu(event, element) {
        const menu = document.getElementById('context-menu');
        menu.style.display = 'block';
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';
        
        menu.onclick = (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.performAction(action, element);
                this.hideContextMenu();
            }
        };
    }

    hideContextMenu() {
        document.getElementById('context-menu').style.display = 'none';
    }

    async performAction(action, element) {
        const path = element.dataset.path;
        const isDirectory = element.dataset.isDirectory === 'true';
        
        switch (action) {
            case 'rename':
                const newName = prompt('Enter new name:', path.split('\\').pop());
                if (newName) {
                    await this.renameItem(path, newName);
                }
                break;
            case 'delete':
                if (confirm('Are you sure you want to delete this item?')) {
                    await this.deleteItem(path);
                }
                break;
            case 'copy':
                await navigator.clipboard.writeText(path);
                break;
            case 'properties':
                alert(`Properties for: ${path}`);
                break;
        }
    }

    async renameItem(oldPath, newName) {
        try {
            const response = await fetch('/api/files/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPath, newName })
            });
            
            if (!response.ok) throw new Error('Rename failed');
            await this.loadPath(this.currentPath);
        } catch (error) {
            console.error('Failed to rename:', error);
            this.showError('Failed to rename item');
        }
    }

    async deleteItem(path) {
        try {
            const response = await fetch('/api/files/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            
            if (!response.ok) throw new Error('Delete failed');
            await this.loadPath(this.currentPath);
        } catch (error) {
            console.error('Failed to delete:', error);
            this.showError('Failed to delete item');
        }
    }

    async openConfigModal() {
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            document.getElementById('config-text').value = JSON.stringify(config, null, 2);
            document.getElementById('config-modal').style.display = 'block';
        } catch (error) {
            console.error('Failed to load config:', error);
            this.showError('Failed to load configuration');
        }
    }

    closeConfigModal() {
        document.getElementById('config-modal').style.display = 'none';
    }

    async saveConfiguration() {
        try {
            const configText = document.getElementById('config-text').value;
            const config = JSON.parse(configText);
            
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            
            if (!response.ok) throw new Error('Save failed');
            
            this.tabs = config.tabs;
            this.renderTabs();
            this.closeConfigModal();
        } catch (error) {
            console.error('Failed to save config:', error);
            this.showError('Failed to save configuration');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FileManager();
});