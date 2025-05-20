// Global variables
let allLawyers = [];
let currentModal = null;

// DOM content loaded event
document.addEventListener('DOMContentLoaded', function() {
    // Fetch lawyers data
    fetchAllLawyers();
    
    // Add event listener for sidebar toggle
    const toggleBtn = document.querySelector('.toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Add event listener for search
    const searchInput = document.querySelector('.filter-group input[type="text"]');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterLawyers(this.value.toLowerCase());
        });
    }
    
    // Add event listener for date filter
    const dateInput = document.querySelector('.filter-group input[type="date"]');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            // This will be used for filtering by meeting date if that feature is added later
        });
    }
    
    // Add event listener for filter button
    const filterButton = document.querySelector('.filter-group .btn:first-of-type');
    if (filterButton) {
        filterButton.addEventListener('click', function() {
            const searchTerm = document.querySelector('.filter-group input[type="text"]').value.toLowerCase();
            filterLawyers(searchTerm);
        });
    }
    
    // Add event listener for add lawyer button
    const addLawyerBtn = document.querySelector('.filter-group .btn:last-of-type');
    if (addLawyerBtn) {
        addLawyerBtn.addEventListener('click', function() {
            showAddLawyerModal();
        });
    }
});

// Fetch all lawyers
function fetchAllLawyers() {
    // Show loading state
    const tableBody = document.querySelector('.data-table table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="loading-data">
                    <i class="fas fa-spinner fa-spin"></i> Loading lawyers data...
                </td>
            </tr>
        `;
    }
    
    fetch('/api/lawyers/all')
        .then(response => response.json())
        .then(data => {
            allLawyers = data;
            renderLawyersTable(allLawyers);
        })
        .catch(err => {
            console.error('Error fetching lawyers:', err);
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="error-data">
                            <i class="fas fa-exclamation-triangle"></i> Failed to load lawyers. Please try again later.
                        </td>
                    </tr>
                `;
            }
        });
}

// Render lawyers table
function renderLawyersTable(lawyers) {
    const tableBody = document.querySelector('.data-table table tbody');
    if (!tableBody) return;
    
    if (lawyers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-data">
                    No lawyers found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Add rows for each lawyer
    lawyers.forEach(lawyer => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${lawyer.lawyerID}</td>
            <td>${lawyer.name}</td>
            <td>${formatPhone(lawyer.contact_no)}</td>
            <td>
                <button class="btn edit-btn" data-id="${lawyer.lawyerID}">Edit</button>
                <button class="btn delete-btn" data-id="${lawyer.lawyerID}">Delete</button>
                <button class="btn view-btn" data-id="${lawyer.lawyerID}">View</button>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Add event listeners for buttons
        const editBtn = row.querySelector('.edit-btn');
        editBtn.addEventListener('click', function() {
            const lawyerId = this.getAttribute('data-id');
            editLawyer(lawyerId);
        });
        
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            const lawyerId = this.getAttribute('data-id');
            confirmDeleteLawyer(lawyerId);
        });
        
        const viewBtn = row.querySelector('.view-btn');
        viewBtn.addEventListener('click', function() {
            const lawyerId = this.getAttribute('data-id');
            viewLawyerDetails(lawyerId);
        });
    });
}

// Format phone number for display
function formatPhone(phoneNumber) {
    if (!phoneNumber) return 'N/A';
    
    // If already formatted, return as is
    if (phoneNumber.includes(' ') || phoneNumber.includes('-') || phoneNumber.includes('+')) {
        return phoneNumber;
    }
    
    // If it's a 10-digit number, format as XXX-XXX-XXXX
    if (phoneNumber.length === 10) {
        return `${phoneNumber.substring(0, 3)}-${phoneNumber.substring(3, 6)}-${phoneNumber.substring(6)}`;
    }
    
    // Otherwise return as is
    return phoneNumber;
}

// Filter lawyers by search term
function filterLawyers(searchTerm) {
    if (!searchTerm) {
        renderLawyersTable(allLawyers);
        return;
    }
    
    const filteredLawyers = allLawyers.filter(lawyer => 
        lawyer.lawyerID.toLowerCase().includes(searchTerm) ||
        lawyer.name.toLowerCase().includes(searchTerm) ||
        (lawyer.contact_no && lawyer.contact_no.toLowerCase().includes(searchTerm))
    );
    
    renderLawyersTable(filteredLawyers);
}

// Show add lawyer modal
function showAddLawyerModal() {
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
                <h2>Add New Lawyer</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="add-lawyer-form">
                    <div class="form-group">
                        <label for="lawyer-id">Lawyer ID</label>
                        <input type="text" id="lawyer-id" placeholder="Enter Lawyer ID (e.g., L123)" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="lawyer-name">Name</label>
                        <input type="text" id="lawyer-name" placeholder="Enter Full Name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="lawyer-contact">Contact Number</label>
                        <input type="tel" id="lawyer-contact" placeholder="Enter Contact Number" required>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Add Lawyer</button>
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
    const form = modalContainer.querySelector('#add-lawyer-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        addNewLawyer(form);
    });
}

// Add new lawyer
function addNewLawyer(form) {
    const lawyerId = form.querySelector('#lawyer-id').value;
    const name = form.querySelector('#lawyer-name').value;
    const contactNo = form.querySelector('#lawyer-contact').value;
    
    // Create lawyer object
    const newLawyer = {
        lawyerID: lawyerId,
        name,
        contact_no: contactNo
    };
    
    // Send data to server
    fetch('/api/lawyers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newLawyer)
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
            showNotification('Lawyer added successfully', 'success');
            
            // Refresh lawyers data
            fetchAllLawyers();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to add lawyer', 'error');
        }
    })
    .catch(err => {
        console.error('Error adding lawyer:', err);
        showNotification('Failed to add lawyer. Please try again later.', 'error');
    });
}

// Edit lawyer
function editLawyer(lawyerId) {
    // First, get the lawyer details
    fetch(`/api/lawyers/${lawyerId}`)
        .then(response => response.json())
        .then(lawyer => {
            showEditLawyerModal(lawyer);
        })
        .catch(err => {
            console.error('Error fetching lawyer details:', err);
            showNotification('Failed to load lawyer details.', 'error');
        });
}

// Show edit lawyer modal
function showEditLawyerModal(lawyer) {
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
                <h2>Edit Lawyer</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="edit-lawyer-form">
                    <input type="hidden" id="lawyer-id" value="${lawyer.lawyerID}">
                    
                    <div class="form-group">
                        <label for="lawyer-name">Name</label>
                        <input type="text" id="lawyer-name" value="${lawyer.name}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="lawyer-contact">Contact Number</label>
                        <input type="tel" id="lawyer-contact" value="${lawyer.contact_no}" required>
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
    const form = modalContainer.querySelector('#edit-lawyer-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        updateLawyer(form);
    });
}

// Update lawyer
function updateLawyer(form) {
    const lawyerId = form.querySelector('#lawyer-id').value;
    const name = form.querySelector('#lawyer-name').value;
    const contactNo = form.querySelector('#lawyer-contact').value;
    
    // Create updated lawyer object
    const updatedLawyer = {
        name,
        contact_no: contactNo
    };
    
    // Send data to server
    fetch(`/api/lawyers/${lawyerId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedLawyer)
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
            showNotification('Lawyer updated successfully', 'success');
            
            // Refresh lawyers data
            fetchAllLawyers();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to update lawyer', 'error');
        }
    })
    .catch(err => {
        console.error('Error updating lawyer:', err);
        showNotification('Failed to update lawyer. Please try again later.', 'error');
    });
}

// Confirm delete lawyer
function confirmDeleteLawyer(lawyerId) {
    if (confirm(`Are you sure you want to delete lawyer with ID ${lawyerId}? This action cannot be undone.`)) {
        deleteLawyer(lawyerId);
    }
}

// Delete lawyer
function deleteLawyer(lawyerId) {
    fetch(`/api/lawyers/${lawyerId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification('Lawyer deleted successfully', 'success');
            
            // Refresh lawyers data
            fetchAllLawyers();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to delete lawyer', 'error');
        }
    })
    .catch(err => {
        console.error('Error deleting lawyer:', err);
        showNotification('Failed to delete lawyer. Please try again later.', 'error');
    });
}

// View lawyer details
function viewLawyerDetails(lawyerId) {
    // First, get the lawyer details
    fetch(`/api/lawyers/${lawyerId}`)
        .then(response => response.json())
        .then(lawyer => {
            // Then, get all cases for this lawyer
            return Promise.all([
                Promise.resolve(lawyer),
                fetch(`/api/lawyers/${lawyerId}/cases`).then(res => res.json())
            ]);
        })
        .then(([lawyer, cases]) => {
            showLawyerDetailsModal(lawyer, cases);
        })
        .catch(err => {
            console.error('Error fetching lawyer details:', err);
            showNotification('Failed to load lawyer details.', 'error');
        });
}

// Show lawyer details modal
function showLawyerDetailsModal(lawyer, cases) {
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
    }
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Format cases into table rows
    let casesContent = '';
    if (cases.length > 0) {
        casesContent = `
            <table class="details-table">
                <thead>
                    <tr>
                        <th>Case ID</th>
                        <th>Prisoner</th>
                        <th>Crime</th>
                        <th>Status</th>
                        <th>Sentence</th>
                    </tr>
                </thead>
                <tbody>
                    ${cases.map(caseItem => `
                        <tr>
                            <td>${caseItem.caseID}</td>
                            <td>${caseItem.prisoner_name || 'Unknown'}</td>
                            <td>${caseItem.crime || 'Not specified'}</td>
                            <td>${capitalize(caseItem.case_status)}</td>
                            <td>${caseItem.sentence_duration ? `${caseItem.sentence_duration} years` : 'TBD'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        casesContent = '<p class="no-data">No cases found for this lawyer.</p>';
    }
    
    // Set modal content
    modalContainer.innerHTML = `
        <div class="modal lawyer-details-modal">
            <div class="modal-header">
                <h2>Lawyer Details</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="details-section">
                    <h3>Personal Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Lawyer ID</label>
                            <div>${lawyer.lawyerID}</div>
                        </div>
                        <div class="info-item">
                            <label>Name</label>
                            <div>${lawyer.name}</div>
                        </div>
                        <div class="info-item">
                            <label>Contact Number</label>
                            <div>${formatPhone(lawyer.contact_no)}</div>
                        </div>
                    </div>
                </div>
                
                <div class="details-section">
                    <h3>Cases</h3>
                    <div class="cases-list">
                        ${casesContent}
                    </div>
                </div>
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
}

// Helper function to capitalize first letter
function capitalize(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
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