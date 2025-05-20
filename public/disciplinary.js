// Global variables
let allDisciplinaryActions = [];
let currentModal = null;

// DOM content loaded event
document.addEventListener('DOMContentLoaded', function() {
    // Fetch disciplinary actions
    fetchAllDisciplinaryActions();
    
    // Add event listener for sidebar toggle
    const toggleBtn = document.querySelector('.toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Add event listener for search
    const searchInput = document.querySelector('.filters input[type="text"]');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterBySearch(this.value.toLowerCase());
        });
    }
    
    // Add event listener for violation type filter
    const violationSelect = document.querySelector('.filters select');
    if (violationSelect) {
        violationSelect.addEventListener('change', function() {
            filterByViolation(this.value.toLowerCase());
        });
    }
    
    // Add event listener for date filter
    const dateInput = document.querySelector('.filters input[type="date"]');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            filterByDate(this.value);
        });
    }
    
    // Add event listener for filter button
    const filterBtn = document.querySelector('.filters .btn:not(.add-new)');
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            applyAllFilters();
        });
    }
    
    // Add event listener for add new button
    const addBtn = document.querySelector('.filters .add-new');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            showAddDisciplinaryModal();
        });
    }
});

// Fetch all disciplinary actions
function fetchAllDisciplinaryActions() {
    // Show loading state
    const tableBody = document.querySelector('.data-table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-data">
                    <i class="fas fa-spinner fa-spin"></i> Loading disciplinary actions...
                </td>
            </tr>
        `;
    }
    
    fetch('/api/disciplinary')
        .then(response => response.json())
        .then(data => {
            allDisciplinaryActions = data;
            renderDisciplinaryTable(allDisciplinaryActions);
        })
        .catch(err => {
            console.error('Error fetching disciplinary actions:', err);
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="error-data">
                            <i class="fas fa-exclamation-triangle"></i> Failed to load disciplinary actions. Please try again later.
                        </td>
                    </tr>
                `;
            }
        });
}

// Render disciplinary actions table
function renderDisciplinaryTable(actions) {
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody) return;
    
    if (actions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-data">
                    No disciplinary actions found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Add rows for each disciplinary action
    actions.forEach(action => {
        const row = document.createElement('tr');
        
        // Format date
        const actionDate = new Date(action.action_date);
        const formattedDate = actionDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        row.innerHTML = `
            <td>${action.actionID}</td>
            <td>${action.prisonerID}</td>
            <td>${action.prisoner_name || 'Unknown'}</td>
            <td>${formattedDate}</td>
            <td>${action.reason}</td>
            <td>${action.cellID || '-'}</td>
            <td class="actions">
                <button class="btn edit-btn" data-id="${action.actionID}">Edit</button>
                <button class="btn delete-btn" data-id="${action.actionID}">Delete</button>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Add event listeners for buttons
        const editBtn = row.querySelector('.edit-btn');
        editBtn.addEventListener('click', function() {
            const actionId = this.getAttribute('data-id');
            editDisciplinaryAction(actionId);
        });
        
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            const actionId = this.getAttribute('data-id');
            confirmDeleteAction(actionId);
        });
    });
}

// Filter disciplinary actions by search term
function filterBySearch(searchTerm) {
    if (!searchTerm) {
        // If no search term, apply other filters if any
        applyFiltersExceptSearch();
        return;
    }
    
    const filteredActions = allDisciplinaryActions.filter(action => 
        action.actionID.toLowerCase().includes(searchTerm) ||
        action.prisonerID.toLowerCase().includes(searchTerm) ||
        (action.prisoner_name && action.prisoner_name.toLowerCase().includes(searchTerm)) ||
        action.reason.toLowerCase().includes(searchTerm) ||
        (action.cellID && action.cellID.toLowerCase().includes(searchTerm))
    );
    
    renderDisciplinaryTable(filteredActions);
}

// Filter disciplinary actions by violation type
function filterByViolation(violationType) {
    if (!violationType) {
        // If no violation type selected, apply other filters if any
        applyFiltersExceptViolation();
        return;
    }
    
    const filteredActions = allDisciplinaryActions.filter(action => {
        const reason = action.reason.toLowerCase();
        
        switch (violationType) {
            case 'fighting':
                return reason.includes('fight') || reason.includes('altercation') || reason.includes('assault');
            case 'contraband':
                return reason.includes('contraband') || reason.includes('unauthorized') || reason.includes('illegal') || reason.includes('possession');
            case 'disobedience':
                return reason.includes('disobey') || reason.includes('insubordination') || reason.includes('disrespect') || reason.includes('refusal');
            default:
                return true;
        }
    });
    
    renderDisciplinaryTable(filteredActions);
}

// Filter disciplinary actions by date
function filterByDate(dateString) {
    if (!dateString) {
        // If no date selected, apply other filters if any
        applyFiltersExceptDate();
        return;
    }
    
    // Format date for comparison (YYYY-MM-DD)
    const selectedDate = new Date(dateString);
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const formattedSelectedDate = `${year}-${month}-${day}`;
    
    const filteredActions = allDisciplinaryActions.filter(action => {
        const actionDate = new Date(action.action_date);
        const actionYear = actionDate.getFullYear();
        const actionMonth = String(actionDate.getMonth() + 1).padStart(2, '0');
        const actionDay = String(actionDate.getDate()).padStart(2, '0');
        const formattedActionDate = `${actionYear}-${actionMonth}-${actionDay}`;
        
        return formattedActionDate === formattedSelectedDate;
    });
    
    renderDisciplinaryTable(filteredActions);
}

// Apply all filters together
function applyAllFilters() {
    const searchTerm = document.querySelector('.filters input[type="text"]').value.toLowerCase();
    const violationType = document.querySelector('.filters select').value.toLowerCase();
    const dateString = document.querySelector('.filters input[type="date"]').value;
    
    let filteredActions = [...allDisciplinaryActions];
    
    // Apply search filter
    if (searchTerm) {
        filteredActions = filteredActions.filter(action => 
            action.actionID.toLowerCase().includes(searchTerm) ||
            action.prisonerID.toLowerCase().includes(searchTerm) ||
            (action.prisoner_name && action.prisoner_name.toLowerCase().includes(searchTerm)) ||
            action.reason.toLowerCase().includes(searchTerm) ||
            (action.cellID && action.cellID.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply violation type filter
    if (violationType) {
        filteredActions = filteredActions.filter(action => {
            const reason = action.reason.toLowerCase();
            
            switch (violationType) {
                case 'fighting':
                    return reason.includes('fight') || reason.includes('altercation') || reason.includes('assault');
                case 'contraband':
                    return reason.includes('contraband') || reason.includes('unauthorized') || reason.includes('illegal') || reason.includes('possession');
                case 'disobedience':
                    return reason.includes('disobey') || reason.includes('insubordination') || reason.includes('disrespect') || reason.includes('refusal');
                default:
                    return true;
            }
        });
    }
    
    // Apply date filter
    if (dateString) {
        // Format date for comparison (YYYY-MM-DD)
        const selectedDate = new Date(dateString);
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const formattedSelectedDate = `${year}-${month}-${day}`;
        
        filteredActions = filteredActions.filter(action => {
            const actionDate = new Date(action.action_date);
            const actionYear = actionDate.getFullYear();
            const actionMonth = String(actionDate.getMonth() + 1).padStart(2, '0');
            const actionDay = String(actionDate.getDate()).padStart(2, '0');
            const formattedActionDate = `${actionYear}-${actionMonth}-${actionDay}`;
            
            return formattedActionDate === formattedSelectedDate;
        });
    }
    
    renderDisciplinaryTable(filteredActions);
}

// Apply filters except search
function applyFiltersExceptSearch() {
    const violationType = document.querySelector('.filters select').value.toLowerCase();
    const dateString = document.querySelector('.filters input[type="date"]').value;
    
    let filteredActions = [...allDisciplinaryActions];
    
    // Apply violation type filter
    if (violationType) {
        filteredActions = filteredActions.filter(action => {
            const reason = action.reason.toLowerCase();
            
            switch (violationType) {
                case 'fighting':
                    return reason.includes('fight') || reason.includes('altercation') || reason.includes('assault');
                case 'contraband':
                    return reason.includes('contraband') || reason.includes('unauthorized') || reason.includes('illegal') || reason.includes('possession');
                case 'disobedience':
                    return reason.includes('disobey') || reason.includes('insubordination') || reason.includes('disrespect') || reason.includes('refusal');
                default:
                    return true;
            }
        });
    }
    
    // Apply date filter
    if (dateString) {
        // Format date for comparison (YYYY-MM-DD)
        const selectedDate = new Date(dateString);
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const formattedSelectedDate = `${year}-${month}-${day}`;
        
        filteredActions = filteredActions.filter(action => {
            const actionDate = new Date(action.action_date);
            const actionYear = actionDate.getFullYear();
            const actionMonth = String(actionDate.getMonth() + 1).padStart(2, '0');
            const actionDay = String(actionDate.getDate()).padStart(2, '0');
            const formattedActionDate = `${actionYear}-${actionMonth}-${actionDay}`;
            
            return formattedActionDate === formattedSelectedDate;
        });
    }
    
    renderDisciplinaryTable(filteredActions);
}

// Apply filters except violation type
function applyFiltersExceptViolation() {
    const searchTerm = document.querySelector('.filters input[type="text"]').value.toLowerCase();
    const dateString = document.querySelector('.filters input[type="date"]').value;
    
    let filteredActions = [...allDisciplinaryActions];
    
    // Apply search filter
    if (searchTerm) {
        filteredActions = filteredActions.filter(action => 
            action.actionID.toLowerCase().includes(searchTerm) ||
            action.prisonerID.toLowerCase().includes(searchTerm) ||
            (action.prisoner_name && action.prisoner_name.toLowerCase().includes(searchTerm)) ||
            action.reason.toLowerCase().includes(searchTerm) ||
            (action.cellID && action.cellID.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply date filter
    if (dateString) {
        // Format date for comparison (YYYY-MM-DD)
        const selectedDate = new Date(dateString);
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const formattedSelectedDate = `${year}-${month}-${day}`;
        
        filteredActions = filteredActions.filter(action => {
            const actionDate = new Date(action.action_date);
            const actionYear = actionDate.getFullYear();
            const actionMonth = String(actionDate.getMonth() + 1).padStart(2, '0');
            const actionDay = String(actionDate.getDate()).padStart(2, '0');
            const formattedActionDate = `${actionYear}-${actionMonth}-${actionDay}`;
            
            return formattedActionDate === formattedSelectedDate;
        });
    }
    
    renderDisciplinaryTable(filteredActions);
}

// Apply filters except date
function applyFiltersExceptDate() {
    const searchTerm = document.querySelector('.filters input[type="text"]').value.toLowerCase();
    const violationType = document.querySelector('.filters select').value.toLowerCase();
    
    let filteredActions = [...allDisciplinaryActions];
    
    // Apply search filter
    if (searchTerm) {
        filteredActions = filteredActions.filter(action => 
            action.actionID.toLowerCase().includes(searchTerm) ||
            action.prisonerID.toLowerCase().includes(searchTerm) ||
            (action.prisoner_name && action.prisoner_name.toLowerCase().includes(searchTerm)) ||
            action.reason.toLowerCase().includes(searchTerm) ||
            (action.cellID && action.cellID.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply violation type filter
    if (violationType) {
        filteredActions = filteredActions.filter(action => {
            const reason = action.reason.toLowerCase();
            
            switch (violationType) {
                case 'fighting':
                    return reason.includes('fight') || reason.includes('altercation') || reason.includes('assault');
                case 'contraband':
                    return reason.includes('contraband') || reason.includes('unauthorized') || reason.includes('illegal') || reason.includes('possession');
                case 'disobedience':
                    return reason.includes('disobey') || reason.includes('insubordination') || reason.includes('disrespect') || reason.includes('refusal');
                default:
                    return true;
            }
        });
    }
    
    renderDisciplinaryTable(filteredActions);
}

// Show add disciplinary action modal
function showAddDisciplinaryModal() {
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
    }
    
    // Set current date as default for date input
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Set modal content
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Add New Disciplinary Action</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="add-disciplinary-form">
                    <div class="form-group">
                        <label for="action-id">Action ID</label>
                        <input type="text" id="action-id" placeholder="Enter Action ID (e.g., DA123)" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-id">Prisoner</label>
                        <select id="prisoner-id" required>
                            <option value="">Select Prisoner</option>
                            <!-- Will be populated via JavaScript -->
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="action-date">Action Date</label>
                        <input type="date" id="action-date" value="${formattedDate}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="action-reason">Reason</label>
                        <textarea id="action-reason" placeholder="Enter reason for disciplinary action" rows="3" required></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Add Action</button>
                        <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.appendChild(modalContainer);
    currentModal = modalContainer;
    
    // Load prisoners for dropdown
    loadPrisonerDropdown();
    
    // Add event listener for close button
    modalContainer.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    // Add event listener for cancel button
    modalContainer.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    // Add event listener for form submission
    const form = modalContainer.querySelector('#add-disciplinary-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        addNewDisciplinaryAction(form);
    });
}

// Load prisoners for dropdown
function loadPrisonerDropdown() {
    fetch('/api/prisoners')
        .then(response => response.json())
        .then(data => {
            const prisonerSelect = document.getElementById('prisoner-id');
            if (prisonerSelect) {
                data.forEach(prisoner => {
                    const option = document.createElement('option');
                    option.value = prisoner.prisonerID;
                    option.textContent = `${prisoner.name} (${prisoner.prisonerID})`;
                    prisonerSelect.appendChild(option);
                });
            }
        })
        .catch(err => {
            console.error('Error loading prisoners:', err);
        });
}

// Add new disciplinary action
function addNewDisciplinaryAction(form) {
    const actionId = form.querySelector('#action-id').value;
    const prisonerId = form.querySelector('#prisoner-id').value;
    const actionDate = form.querySelector('#action-date').value;
    const reason = form.querySelector('#action-reason').value;
    
    // Create disciplinary action object
    const newAction = {
        actionID: actionId,
        prisonerID: prisonerId,
        action_date: actionDate,
        reason: reason
    };
    
    // Send data to server
    fetch('/api/disciplinary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAction)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (currentModal) {
                document.body.removeChild(currentModal);
                currentModal = null;
            }
            
            // Show success notification
            showNotification('Disciplinary action added successfully', 'success');
            
            // Refresh disciplinary actions data
            fetchAllDisciplinaryActions();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to add disciplinary action', 'error');
        }
    })
    .catch(err => {
        console.error('Error adding disciplinary action:', err);
        showNotification('Failed to add disciplinary action. Please try again later.', 'error');
    });
}

// Edit disciplinary action
function editDisciplinaryAction(actionId) {
    // First, get the disciplinary action details
    fetch(`/api/disciplinary/${actionId}`)
        .then(response => response.json())
        .then(action => {
            showEditDisciplinaryModal(action);
        })
        .catch(err => {
            console.error('Error fetching disciplinary action details:', err);
            showNotification('Failed to load disciplinary action details.', 'error');
        });
}

// Show edit disciplinary action modal
function showEditDisciplinaryModal(action) {
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
    }
    
    // Format date for the input field (YYYY-MM-DD)
    const actionDate = new Date(action.action_date);
    const formattedDate = actionDate.toISOString().split('T')[0];
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Set modal content
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Edit Disciplinary Action</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="edit-disciplinary-form">
                    <input type="hidden" id="action-id" value="${action.actionID}">
                    
                    <div class="form-group">
                        <label for="prisoner-id">Prisoner ID</label>
                        <input type="text" id="prisoner-id" value="${action.prisonerID}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-name">Prisoner Name</label>
                        <input type="text" id="prisoner-name" value="${action.prisoner_name || 'Unknown'}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label for="action-date">Action Date</label>
                        <input type="date" id="action-date" value="${formattedDate}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="action-reason">Reason</label>
                        <textarea id="action-reason" rows="3" required>${action.reason}</textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.appendChild(modalContainer);
    currentModal = modalContainer;
    
    // Add event listener for close button
    modalContainer.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    // Add event listener for cancel button
    modalContainer.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    // Add event listener for form submission
    const form = modalContainer.querySelector('#edit-disciplinary-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        updateDisciplinaryAction(form);
    });
}

// Update disciplinary action
function updateDisciplinaryAction(form) {
    const actionId = form.querySelector('#action-id').value;
    const actionDate = form.querySelector('#action-date').value;
    const reason = form.querySelector('#action-reason').value;
    
    // Create updated disciplinary action object
    const updatedAction = {
        action_date: actionDate,
        reason: reason
    };
    
    // Send data to server
    fetch(`/api/disciplinary/${actionId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedAction)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (currentModal) {
                document.body.removeChild(currentModal);
                currentModal = null;
            }
            
            // Show success notification
            showNotification('Disciplinary action updated successfully', 'success');
            
            // Refresh disciplinary actions data
            fetchAllDisciplinaryActions();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to update disciplinary action', 'error');
        }
    })
    .catch(err => {
        console.error('Error updating disciplinary action:', err);
        showNotification('Failed to update disciplinary action. Please try again later.', 'error');
    });
}

// Confirm delete disciplinary action
function confirmDeleteAction(actionId) {
    if (confirm(`Are you sure you want to delete disciplinary action with ID ${actionId}? This action cannot be undone.`)) {
        deleteDisciplinaryAction(actionId);
    }
}

// Delete disciplinary action
function deleteDisciplinaryAction(actionId) {
    fetch(`/api/disciplinary/${actionId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification('Disciplinary action deleted successfully', 'success');
            
            // Refresh disciplinary actions data
            fetchAllDisciplinaryActions();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to delete disciplinary action', 'error');
        }
    })
    .catch(err => {
        console.error('Error deleting disciplinary action:', err);
        showNotification('Failed to delete disciplinary action. Please try again later.', 'error');
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
    
    document.body.appendChild(notification);
    
    // Add event listener for close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(notification);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 5000);
}