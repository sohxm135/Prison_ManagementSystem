// Global variables
let allWorkAssignments = [];
let currentModal = null;

// DOM content loaded event
document.addEventListener('DOMContentLoaded', function() {
    // Fetch work assignments data
    fetchWorkAssignments();
    
    // Add event listener for sidebar toggle
    const toggleBtn = document.querySelector('.toggle-sidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    }
    
    // Add event listener for search
    const searchInput = document.querySelector('.filter-group input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterWorkAssignments(this.value.toLowerCase());
        });
    }
    
    // Add event listener for search button
    const searchBtn = document.querySelector('.filter-group button:first-of-type');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const searchTerm = document.querySelector('.filter-group input').value.toLowerCase();
            filterWorkAssignments(searchTerm);
        });
    }
    
    // Add event listener for add work assignment button
    const addBtn = document.querySelector('.filter-group button:last-of-type');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            showAddWorkAssignmentModal();
        });
    }
});

// Fetch work assignments
function fetchWorkAssignments() {
    // Show loading state
    const tbody = document.querySelector('.data-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-data">
                    <i class="fas fa-spinner fa-spin"></i> Loading work assignments...
                </td>
            </tr>
        `;
    }
    
    // Fetch data from API
    fetch('/api/work-assignments')
        .then(response => response.json())
        .then(data => {
            allWorkAssignments = data;
            renderWorkAssignmentsTable(allWorkAssignments);
        })
        .catch(err => {
            console.error('Error fetching work assignments:', err);
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="error-data">
                            <i class="fas fa-exclamation-triangle"></i> Failed to load work assignments. Please try again later.
                        </td>
                    </tr>
                `;
            }
        });
}

// Render work assignments table
function renderWorkAssignmentsTable(assignments) {
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody) return;
    
    if (assignments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-data">
                    No work assignments found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Clear the table
    tbody.innerHTML = '';
    
    // Add rows for each assignment
    assignments.forEach(assignment => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${assignment.prisonerID}</td>
            <td>${assignment.name}</td>
            <td>${assignment.department}</td>
            <td>${assignment.assigned_area || 'N/A'}</td>
            <td>
                <button class="btn edit-btn" data-id="${assignment.prisonerID}">Edit</button>
                <button class="btn delete-btn" data-id="${assignment.prisonerID}">Delete</button>
            </td>
        `;
        
        tbody.appendChild(row);
        
        // Add event listeners for buttons
        const editBtn = row.querySelector('.edit-btn');
        editBtn.addEventListener('click', function() {
            const prisonerId = this.getAttribute('data-id');
            editWorkAssignment(prisonerId);
        });
        
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            const prisonerId = this.getAttribute('data-id');
            confirmDeleteWorkAssignment(prisonerId);
        });
    });
}

// Filter work assignments by search term
function filterWorkAssignments(searchTerm) {
    if (!searchTerm) {
        renderWorkAssignmentsTable(allWorkAssignments);
        return;
    }
    
    const filteredAssignments = allWorkAssignments.filter(assignment => {
        return assignment.prisonerID.toLowerCase().includes(searchTerm) ||
               assignment.name.toLowerCase().includes(searchTerm) ||
               assignment.department.toLowerCase().includes(searchTerm) ||
               (assignment.assigned_area && assignment.assigned_area.toLowerCase().includes(searchTerm));
    });
    
    renderWorkAssignmentsTable(filteredAssignments);
}

// Show add work assignment modal
function showAddWorkAssignmentModal() {
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
    }
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Set modal content
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Add Work Assignment</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="add-work-form">
                    <div class="form-group">
                        <label for="prisoner-id">Prisoner</label>
                        <select id="prisoner-id" required>
                            <option value="">Select Prisoner</option>
                            <!-- Will be populated via JavaScript -->
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="work-department">Work Department</label>
                        <select id="work-department" required>
                            <option value="">Select Department</option>
                            <option value="Kitchen">Kitchen</option>
                            <option value="Laundry">Laundry</option>
                            <option value="Cleaning">Cleaning</option>
                            <option value="Library">Library</option>
                            <option value="Maintenance">Maintenance</option>
                        </select>
                    </div>
                    
                    <div class="form-group assigned-area-group" style="display: none;">
                        <label for="assigned-area">Assigned Area</label>
                        <input type="text" id="assigned-area" placeholder="Enter assigned area for cleaning">
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Assign Work</button>
                        <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.appendChild(modalContainer);
    currentModal = modalContainer;
    
    // Load available prisoners for dropdown
    loadAvailablePrisoners();
    
    // Add event listener for department selection to show/hide assigned area
    const departmentSelect = modalContainer.querySelector('#work-department');
    departmentSelect.addEventListener('change', function() {
        const assignedAreaGroup = modalContainer.querySelector('.assigned-area-group');
        if (this.value === 'Cleaning') {
            assignedAreaGroup.style.display = 'block';
            assignedAreaGroup.querySelector('input').setAttribute('required', 'required');
        } else {
            assignedAreaGroup.style.display = 'none';
            assignedAreaGroup.querySelector('input').removeAttribute('required');
        }
    });
    
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
    const form = modalContainer.querySelector('#add-work-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        addWorkAssignment(form);
    });
}

// Load available prisoners (those who don't have a work assignment yet)
function loadAvailablePrisoners() {
    fetch('/api/prisoners/available-for-work')
        .then(response => response.json())
        .then(prisoners => {
            const prisonerSelect = document.getElementById('prisoner-id');
            if (prisonerSelect) {
                prisoners.forEach(prisoner => {
                    const option = document.createElement('option');
                    option.value = prisoner.prisonerID;
                    option.textContent = `${prisoner.name} (${prisoner.prisonerID})`;
                    prisonerSelect.appendChild(option);
                });
            }
        })
        .catch(err => {
            console.error('Error loading available prisoners:', err);
        });
}

// Add new work assignment
function addWorkAssignment(form) {
    const prisonerID = form.querySelector('#prisoner-id').value;
    const department = form.querySelector('#work-department').value;
    const assigned_area = department === 'Cleaning' ? form.querySelector('#assigned-area').value : null;
    
    // Create work assignment object
    const newAssignment = {
        prisonerID,
        department,
        assigned_area
    };
    
    // Send data to server
    fetch('/api/work-assignments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAssignment)
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
            showNotification('Work assignment added successfully', 'success');
            
            // Refresh work assignments data
            fetchWorkAssignments();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to add work assignment', 'error');
        }
    })
    .catch(err => {
        console.error('Error adding work assignment:', err);
        showNotification('Failed to add work assignment. Please try again later.', 'error');
    });
}

// Edit work assignment
function editWorkAssignment(prisonerId) {
    // First, get the work assignment details
    fetch(`/api/work-assignments/${prisonerId}`)
        .then(response => response.json())
        .then(assignment => {
            showEditWorkAssignmentModal(assignment);
        })
        .catch(err => {
            console.error('Error fetching work assignment details:', err);
            showNotification('Failed to load work assignment details.', 'error');
        });
}

// Show edit work assignment modal
function showEditWorkAssignmentModal(assignment) {
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
    }
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Set modal content
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Edit Work Assignment</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="edit-work-form">
                    <input type="hidden" id="prisoner-id" value="${assignment.prisonerID}">
                    
                    <div class="form-group">
                        <label for="prisoner-name">Prisoner</label>
                        <input type="text" id="prisoner-name" value="${assignment.name}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label for="work-department">Work Department</label>
                        <select id="work-department" required>
                            <option value="Kitchen" ${assignment.department === 'Kitchen' ? 'selected' : ''}>Kitchen</option>
                            <option value="Laundry" ${assignment.department === 'Laundry' ? 'selected' : ''}>Laundry</option>
                            <option value="Cleaning" ${assignment.department === 'Cleaning' ? 'selected' : ''}>Cleaning</option>
                            <option value="Library" ${assignment.department === 'Library' ? 'selected' : ''}>Library</option>
                            <option value="Maintenance" ${assignment.department === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                        </select>
                    </div>
                    
                    <div class="form-group assigned-area-group" style="${assignment.department === 'Cleaning' ? 'display: block;' : 'display: none;'}">
                        <label for="assigned-area">Assigned Area</label>
                        <input type="text" id="assigned-area" value="${assignment.assigned_area || ''}" placeholder="Enter assigned area for cleaning">
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Update Assignment</button>
                        <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.appendChild(modalContainer);
    currentModal = modalContainer;
    
    // Add event listener for department selection to show/hide assigned area
    const departmentSelect = modalContainer.querySelector('#work-department');
    departmentSelect.addEventListener('change', function() {
        const assignedAreaGroup = modalContainer.querySelector('.assigned-area-group');
        if (this.value === 'Cleaning') {
            assignedAreaGroup.style.display = 'block';
            assignedAreaGroup.querySelector('input').setAttribute('required', 'required');
        } else {
            assignedAreaGroup.style.display = 'none';
            assignedAreaGroup.querySelector('input').removeAttribute('required');
        }
    });
    
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
    const form = modalContainer.querySelector('#edit-work-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        updateWorkAssignment(form);
    });
}

// Update work assignment
function updateWorkAssignment(form) {
    const prisonerID = form.querySelector('#prisoner-id').value;
    const department = form.querySelector('#work-department').value;
    const assigned_area = department === 'Cleaning' ? form.querySelector('#assigned-area').value : null;
    
    // Create updated work assignment object
    const updatedAssignment = {
        department,
        assigned_area
    };
    
    // Send data to server
    fetch(`/api/work-assignments/${prisonerID}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedAssignment)
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
            showNotification('Work assignment updated successfully', 'success');
            
            // Refresh work assignments data
            fetchWorkAssignments();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to update work assignment', 'error');
        }
    })
    .catch(err => {
        console.error('Error updating work assignment:', err);
        showNotification('Failed to update work assignment. Please try again later.', 'error');
    });
}

// Confirm delete work assignment
function confirmDeleteWorkAssignment(prisonerId) {
    if (confirm(`Are you sure you want to delete work assignment for prisoner ${prisonerId}? This action cannot be undone.`)) {
        deleteWorkAssignment(prisonerId);
    }
}

// Delete work assignment
function deleteWorkAssignment(prisonerId) {
    fetch(`/api/work-assignments/${prisonerId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification('Work assignment deleted successfully', 'success');
            
            // Refresh work assignments data
            fetchWorkAssignments();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to delete work assignment', 'error');
        }
    })
    .catch(err => {
        console.error('Error deleting work assignment:', err);
        showNotification('Failed to delete work assignment. Please try again later.', 'error');
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