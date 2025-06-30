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
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
        
        items.forEach(item => {
            const element = document.createElement('div');
            element.className = 'file-item';
            element.dataset.path = item.path;
            element.dataset.isDirectory = item.isDirectory;
            
            const icon = this.getFileIcon(item);
            const size = item.isDirectory ? '' : this.formatFileSize(item.size);
            const date = new Date(item.lastModified).toLocaleString();
            
            element.innerHTML = `
                <span class="icon">${icon}</span>
                <span class="name">${item.name}</span>
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

    renderTreeView(items, rootPath) {
        const container = document.getElementById('tree-view');
        container.innerHTML = '';
        
        const rootElement = document.createElement('div');
        rootElement.className = 'tree-item selected';
        rootElement.innerHTML = `<span class="icon">📁</span> ${this.getPathName(rootPath)}`;
        rootElement.addEventListener('click', () => {
            this.selectTreeItem(rootElement);
            this.loadPath(rootPath);
        });
        container.appendChild(rootElement);
        
        items.filter(item => item.isDirectory).forEach(item => {
            const element = document.createElement('div');
            element.className = 'tree-item';
            element.style.paddingLeft = '20px';
            element.innerHTML = `<span class="icon">📁</span> ${item.name}`;
            element.addEventListener('click', () => {
                this.selectTreeItem(element);
                this.loadPath(item.path);
            });
            container.appendChild(element);
        });
    }

    selectTreeItem(selectedElement) {
        document.querySelectorAll('.tree-item').forEach(item => item.classList.remove('selected'));
        selectedElement.classList.add('selected');
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
            await this.loadTreeView(this.currentTab.path);
        } else {
            try {
                await fetch(`/api/files/open?path=${encodeURIComponent(item.path)}`, { method: 'POST' });
            } catch (error) {
                console.error('Failed to open file:', error);
                this.showError('Failed to open file');
            }
        }
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