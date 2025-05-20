// Global variables to store jail data
let jails = [];
let blocks = [];
let cells = [];
let jailors = [];
let currentJailId = null;
// Remove the occupancyChart variable since we're not using it anymore

// Load jail data when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Fetch all jail data from the server
    fetchJails();
    
    // Add event listener for sidebar toggle
    const toggleBtn = document.querySelector('.toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Add event listener to the block sort dropdown
    const blockSort = document.getElementById('block-sort');
    if (blockSort) {
        blockSort.addEventListener('change', function() {
            sortBlocks(this.value);
        });
    }
});

// Fetch all jail data from the server
function fetchJails() {
    fetch('/api/jails')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load jail data');
            }
            return response.json();
        })
        .then(data => {
            jails = data;
            updateJailCards();
            
            // Select the first jail by default
            if (jails.length > 0) {
                selectJail(jails[0].jailID);
            }
        })
        .catch(err => {
            console.error('Error loading jail data:', err);
            showNotification('Failed to load jail data. Please refresh the page.', 'error');
        });
}

// Update the jail cards with data from the server
function updateJailCards() {
    const jailCardsContainer = document.querySelector('.jail-selection');
    jailCardsContainer.innerHTML = '';
    
    jails.forEach(jail => {
        const securityClass = `security-${jail.securityLevel.toLowerCase()}`;
        
        const jailCard = document.createElement('div');
        jailCard.className = 'jail-card';
        jailCard.dataset.jailId = jail.jailID;
        
        jailCard.innerHTML = `
            <div class="jail-icon"><i class="fas fa-building"></i></div>
            <h3 class="jail-name">${jail.name}</h3>
            <span class="jail-security ${securityClass}">${jail.securityLevel} Security</span>
            <p class="jail-capacity">Capacity: ${jail.capacity}</p>
        `;
        
        jailCard.addEventListener('click', function() {
            selectJail(jail.jailID);
        });
        
        jailCardsContainer.appendChild(jailCard);
    });
}

// Select a jail and display its details
function selectJail(jailId) {
    currentJailId = jailId;
    
    // Highlight the selected jail card
    document.querySelectorAll('.jail-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.jailId === jailId) {
            card.classList.add('selected');
        }
    });
    
    // Fetch detailed information about the selected jail
    fetch(`/api/jails/${jailId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load jail details');
            }
            return response.json();
        })
        .then(jailDetail => {
            // Update the jail overview panel
            document.getElementById('jail-name').textContent = jailDetail.name;
            document.getElementById('jail-security').textContent = jailDetail.securityLevel;
            document.getElementById('jail-capacity').textContent = jailDetail.capacity;
            document.getElementById('jail-occupancy').textContent = jailDetail.occupancy || '0';
            document.getElementById('chief-jailor').textContent = jailDetail.chiefJailor?.name || 'Not Assigned';
            
            // Removed the updateOccupancyChart call
            
            // Fetch blocks for this jail
            fetchBlocks(jailId);
        })
        .catch(err => {
            console.error('Error loading jail details:', err);
            showNotification('Failed to load jail details.', 'error');
        });
}

// Fetch blocks for a specific jail
function fetchBlocks(jailId) {
    fetch(`/api/jails/${jailId}/blocks`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load block data');
            }
            return response.json();
        })
        .then(data => {
            blocks = data;
            
            // Fetch cells for each block
            const cellPromises = blocks.map(block => 
                fetch(`/api/blocks/${block.blockID}/cells`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Failed to load cell data');
                        }
                        return response.json();
                    })
            );
            
            return Promise.all(cellPromises);
        })
        .then(cellsData => {
            // Flatten the array of cell arrays
            cells = cellsData.flat();
            
            // Count occupied cells for each block
            blocks.forEach(block => {
                const blockCells = cells.filter(cell => cell.blockID === block.blockID);
                block.totalCells = blockCells.length;
                block.occupiedCells = blockCells.filter(cell => cell.isOccupied === 1).length;
                block.occupancyRate = block.totalCells > 0 
                    ? Math.round((block.occupiedCells / block.totalCells) * 100) 
                    : 0;
            });
            
            // Display blocks
            displayBlocks();
        })
        .catch(err => {
            console.error('Error loading block data:', err);
            showNotification('Failed to load block data.', 'error');
        });
}

// Display blocks in the grid
function displayBlocks() {
    const blockGrid = document.getElementById('block-grid');
    blockGrid.innerHTML = '';
    
    blocks.forEach(block => {
        // Fetch jailor information
        fetch(`/api/jailors/${block.jailorID}`)
            .then(response => {
                if (!response.ok) {
                    return { name: 'Not Assigned' };
                }
                return response.json();
            })
            .then(jailor => {
                const blockCard = document.createElement('div');
                blockCard.className = 'block-card';
                blockCard.dataset.blockId = block.blockID;
                
                // Determine block status class based on occupancy
                let statusClass = 'status-normal';
                if (block.occupancyRate >= 90) {
                    statusClass = 'status-full';
                } else if (block.occupancyRate >= 70) {
                    statusClass = 'status-high';
                }
                
                blockCard.innerHTML = `
                    <div class="block-header ${statusClass}">
                        <h3>${block.name}</h3>
                        <span class="block-status">${block.occupancyRate}% Full</span>
                    </div>
                    <div class="block-body">
                        <p><strong>Jailor:</strong> ${jailor.name}</p>
                        <p><strong>Cells:</strong> ${block.occupiedCells}/${block.totalCells}</p>
                        <p><strong>Capacity:</strong> ${block.capacity}</p>
                    </div>
                    <div class="block-footer">
                        <button class="btn view-cells-btn" data-block-id="${block.blockID}">View Cells</button>
                    </div>
                `;
                
                blockGrid.appendChild(blockCard);
                
                // Add event listener to view cells button
                blockCard.querySelector('.view-cells-btn').addEventListener('click', function() {
                    viewCells(block.blockID);
                });
            });
    });
}

// Sort blocks based on selected criteria
function sortBlocks(criteria) {
    switch(criteria) {
        case 'name':
            blocks.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'capacity':
            blocks.sort((a, b) => b.capacity - a.capacity);
            break;
        case 'occupancy':
            blocks.sort((a, b) => b.occupancyRate - a.occupancyRate);
            break;
    }
    
    displayBlocks();
}

// View cells for a specific block
function viewCells(blockId) {
    const blockCells = cells.filter(cell => cell.blockID === blockId);
    const selectedBlock = blocks.find(block => block.blockID === blockId);
    
    // Create a modal to display cells
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    let cellsHtml = '';
    blockCells.forEach(cell => {
        const statusClass = cell.isOccupied === 1 ? 'cell-occupied' : 'cell-vacant';
        cellsHtml += `
            <div class="cell-item ${statusClass}">
                <div class="cell-id">${cell.cellID}</div>
                <div class="cell-status">${cell.isOccupied === 1 ? 'Occupied' : 'Vacant'}</div>
            </div>
        `;
    });
    
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Cells in ${selectedBlock.name}</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="cells-container">
                    ${cellsHtml.length > 0 ? cellsHtml : '<p>No cells found in this block.</p>'}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalContainer);
    
    // Add event listener to close button
    const closeButton = modalContainer.querySelector('.close-modal');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modalContainer);
    });
}

// Removed the updateOccupancyChart function since we're not using it anymore

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="close-notification"><i class="fas fa-times"></i></button>
    `;
    
    // Add notification to the DOM
    document.body.appendChild(notification);
    
    // Add event listener to close button
    const closeButton = notification.querySelector('.close-notification');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(notification);
    });
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 5000);
}