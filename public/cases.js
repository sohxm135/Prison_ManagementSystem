// Global variables
let allCases = [];
let currentModal = null;

// DOM content loaded event
document.addEventListener('DOMContentLoaded', function() {
    // Fetch cases data
    fetchAllCases();
    
    // Add event listener for sidebar toggle
    const toggleBtn = document.querySelector('.toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Add event listener for search
    const searchInput = document.querySelector('.prisoner-search input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterCasesBySearch(this.value.toLowerCase());
        });
    }
    
    // Add event listener for search button
    const searchButton = document.querySelector('.prisoner-search button');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchTerm = document.querySelector('.prisoner-search input').value.toLowerCase();
            filterCasesBySearch(searchTerm);
        });
    }
    
    // Add event listener for status filter
    const statusFilter = document.querySelector('.filter-group select');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            filterCasesByStatus(this.value);
        });
    }
    
    // Add event listener for add case button
    const addCaseBtn = document.querySelector('.case-actions .btn');
    if (addCaseBtn) {
        addCaseBtn.addEventListener('click', function() {
            showAddCaseModal();
        });
    }
});

// Fetch all cases
function fetchAllCases() {
    // Show loading state
    const caseList = document.querySelector('.case-list');
    if (caseList) {
        caseList.innerHTML = `
            <div class="loading-container">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading cases data...</p>
            </div>
        `;
    }
    
    fetch('/api/cases')
        .then(response => response.json())
        .then(data => {
            allCases = data;
            renderCaseCards(allCases);
        })
        .catch(err => {
            console.error('Error fetching cases:', err);
            if (caseList) {
                caseList.innerHTML = `
                    <div class="error-container">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load cases. Please try again later.</p>
                    </div>
                `;
            }
        });
}

// Render case cards
function renderCaseCards(cases) {
    const caseList = document.querySelector('.case-list');
    if (!caseList) return;
    
    if (cases.length === 0) {
        caseList.innerHTML = `
            <div class="empty-container">
                <i class="fas fa-folder-open"></i>
                <p>No cases found.</p>
            </div>
        `;
        return;
    }
    
    // Empty the list
    caseList.innerHTML = '';
    
    // Add cards for each case
    cases.forEach(caseItem => {
        // Format date
        const openedDate = new Date(caseItem.opened_date || new Date());
        const formattedDate = openedDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        // Format sentence (if TBD)
        const sentenceText = caseItem.sentence_duration ? `${caseItem.sentence_duration} years` : 'TBD';
        
        // Create card element
        const cardDiv = document.createElement('div');
        cardDiv.className = 'case-card';
        cardDiv.dataset.id = caseItem.caseID;
        cardDiv.dataset.status = caseItem.case_status;
        
        // Set card content
        cardDiv.innerHTML = `
            <h3 class="case-title">${caseItem.caseID}</h3>
            <div class="case-meta">
                <span><i class="fas fa-calendar"></i> Opened: ${formattedDate}</span>
                <span><i class="fas fa-user"></i> Prisoner: ${caseItem.prisoner_name || 'Unknown'}</span>
                <span><i class="fas fa-briefcase"></i> Lawyer: ${caseItem.lawyer_name || 'Unknown'}</span>
            </div>
            <div class="case-details">
                <div class="case-detail-item">
                    <span class="info-label">Crime</span>
                    <span class="info-value">${caseItem.crime || 'Not specified'}</span>
                </div>
                <div class="case-detail-item">
                    <span class="info-label">Sentence</span>
                    <span class="info-value">${sentenceText}</span>
                </div>
                <div class="case-detail-item">
                    <span class="info-label">Prisoner ID</span>
                    <span class="info-value">${caseItem.prisonerID}</span>
                </div>
                <div class="case-detail-item">
                    <span class="info-label">Lawyer ID</span>
                    <span class="info-value">${caseItem.lawyerID}</span>
                </div>
            </div>
            <span class="case-status status-${caseItem.case_status.toLowerCase()}">${caseItem.case_status.charAt(0).toUpperCase() + caseItem.case_status.slice(1)}</span>
            <div class="case-footer">
                <div class="case-actions">
                    <button class="edit-btn"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        
        // Add to the list
        caseList.appendChild(cardDiv);
        
        // Add event listener for edit button
        const editBtn = cardDiv.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => {
            editCase(caseItem.caseID);
        });
        
        // Add event listener for delete button
        const deleteBtn = cardDiv.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            confirmDeleteCase(caseItem.caseID);
        });
    });
}

// Filter cases by search term
function filterCasesBySearch(searchTerm) {
    if (!searchTerm) {
        // If search term is empty, reset filters
        const statusFilter = document.querySelector('.filter-group select');
        if (statusFilter) {
            filterCasesByStatus(statusFilter.value);
        } else {
            renderCaseCards(allCases);
        }
        return;
    }
    
    // Filter cases based on search term
    const statusFilter = document.querySelector('.filter-group select');
    const statusValue = statusFilter ? statusFilter.value : 'all';
    
    let filteredCases = allCases;
    
    // Apply status filter if not "all"
    if (statusValue !== 'all') {
        filteredCases = filteredCases.filter(caseItem => 
            caseItem.case_status.toLowerCase() === statusValue
        );
    }
    
    // Apply search filter
    filteredCases = filteredCases.filter(caseItem => 
        caseItem.caseID.toLowerCase().includes(searchTerm) ||
        caseItem.prisonerID.toLowerCase().includes(searchTerm) ||
        caseItem.lawyerID.toLowerCase().includes(searchTerm) ||
        (caseItem.prisoner_name && caseItem.prisoner_name.toLowerCase().includes(searchTerm)) ||
        (caseItem.lawyer_name && caseItem.lawyer_name.toLowerCase().includes(searchTerm)) ||
        (caseItem.crime && caseItem.crime.toLowerCase().includes(searchTerm))
    );
    
    renderCaseCards(filteredCases);
}

// Filter cases by status
function filterCasesByStatus(status) {
    if (status === 'all') {
        const searchTerm = document.querySelector('.prisoner-search input').value.toLowerCase();
        if (searchTerm) {
            filterCasesBySearch(searchTerm);
        } else {
            renderCaseCards(allCases);
        }
        return;
    }
    
    // Filter cases based on status
    const filteredCases = allCases.filter(caseItem => 
        caseItem.case_status.toLowerCase() === status
    );
    
    // Apply search filter if present
    const searchTerm = document.querySelector('.prisoner-search input').value.toLowerCase();
    if (searchTerm) {
        const searchFiltered = filteredCases.filter(caseItem => 
            caseItem.caseID.toLowerCase().includes(searchTerm) ||
            caseItem.prisonerID.toLowerCase().includes(searchTerm) ||
            caseItem.lawyerID.toLowerCase().includes(searchTerm) ||
            (caseItem.prisoner_name && caseItem.prisoner_name.toLowerCase().includes(searchTerm)) ||
            (caseItem.lawyer_name && caseItem.lawyer_name.toLowerCase().includes(searchTerm)) ||
            (caseItem.crime && caseItem.crime.toLowerCase().includes(searchTerm))
        );
        
        renderCaseCards(searchFiltered);
    } else {
        renderCaseCards(filteredCases);
    }
}

// Show add case modal
function showAddCaseModal() {
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
                <h2>Add New Case</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="add-case-form">
                    <div class="form-group">
                        <label for="case-id">Case ID</label>
                        <input type="text" id="case-id" placeholder="Enter Case ID (e.g., CASE123)" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-id">Prisoner ID</label>
                        <select id="prisoner-id" required>
                            <option value="">Select Prisoner</option>
                            <!-- Will be populated via JavaScript -->
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="lawyer-id">Lawyer ID</label>
                        <select id="lawyer-id" required>
                            <option value="">Select Lawyer</option>
                            <!-- Will be populated via JavaScript -->
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="case-status">Status</label>
                        <select id="case-status" required>
                            <option value="">Select Status</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="sentence-duration">Sentence Duration (Years)</label>
                        <input type="number" id="sentence-duration" min="0" placeholder="Leave empty for TBD">
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Add Case</button>
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
    
    // Load lawyers for dropdown
    loadLawyerDropdown();
    
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
    const form = modalContainer.querySelector('#add-case-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        addNewCase(form);
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

// Load lawyers for dropdown
function loadLawyerDropdown() {
    fetch('/api/lawyers')
        .then(response => response.json())
        .then(data => {
            const lawyerSelect = document.getElementById('lawyer-id');
            if (lawyerSelect) {
                data.forEach(lawyer => {
                    const option = document.createElement('option');
                    option.value = lawyer.lawyerID;
                    option.textContent = `${lawyer.name} (${lawyer.lawyerID})`;
                    lawyerSelect.appendChild(option);
                });
            }
        })
        .catch(err => {
            console.error('Error loading lawyers:', err);
        });
}

// Add new case
function addNewCase(form) {
    const caseId = form.querySelector('#case-id').value;
    const prisonerId = form.querySelector('#prisoner-id').value;
    const lawyerId = form.querySelector('#lawyer-id').value;
    const caseStatus = form.querySelector('#case-status').value;
    const sentenceDuration = form.querySelector('#sentence-duration').value;
    
    // Create case object
    const newCase = {
        caseID: caseId,
        prisonerID: prisonerId,
        lawyerID: lawyerId,
        case_status: caseStatus,
        sentence_duration: sentenceDuration ? parseInt(sentenceDuration) : null
    };
    
    // Send data to server
    fetch('/api/cases', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCase)
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
            showNotification('Case added successfully', 'success');
            
            // Refresh case data
            fetchAllCases();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to add case', 'error');
        }
    })
    .catch(err => {
        console.error('Error adding case:', err);
        showNotification('Failed to add case. Please try again later.', 'error');
    });
}

// Show confirmation before deleting a case
function confirmDeleteCase(caseId) {
    if (confirm(`Are you sure you want to delete case #${caseId}? This action cannot be undone.`)) {
        deleteCase(caseId);
    }
}

// Delete a case
function deleteCase(caseId) {
    fetch(`/api/cases/${caseId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification('Case deleted successfully', 'success');
            
            // Refresh case data
            fetchAllCases();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to delete case', 'error');
        }
    })
    .catch(err => {
        console.error('Error deleting case:', err);
        showNotification('Failed to delete case. Please try again later.', 'error');
    });
}

// Edit case (placeholder - will be implemented later)
function editCase(caseId) {
    // Placeholder
    console.log(`Edit case with ID: ${caseId}`);
    // You can implement this feature similar to the add case functionality
    alert(`Edit functionality for ${caseId} will be implemented soon!`);
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