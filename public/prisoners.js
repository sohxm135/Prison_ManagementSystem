// Global variables
let allPrisoners = [];
let currentModal = null;

// DOM content loaded event
document.addEventListener('DOMContentLoaded', function() {
    // Fetch prisoners data
    fetchAllPrisoners();
    
    // Add event listener for sidebar toggle
    const toggleBtn = document.querySelector('.toggle-sidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });
    }
    
    // Add event listener for search
    const searchInput = document.querySelector('.prisoner-search input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterPrisoners(this.value.toLowerCase());
        });
    }
    
    // Add event listener for search button
    const searchBtn = document.querySelector('.prisoner-search button');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const searchTerm = document.querySelector('.prisoner-search input').value.toLowerCase();
            filterPrisoners(searchTerm);
        });
    }
    
    // Add event listener for prison filter
    const prisonFilter = document.querySelector('.filter-group select:first-of-type');
    if (prisonFilter) {
        prisonFilter.addEventListener('change', function() {
            applyFilters();
        });
    }
    
    // Add event listener for crime filter
    const crimeFilter = document.querySelector('.filter-group select:last-of-type');
    if (crimeFilter) {
        crimeFilter.addEventListener('change', function() {
            applyFilters();
        });
    }
    
    // Add event listener for add prisoner button
    const addBtn = document.querySelector('.prisoner-filters .btn');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            showAddPrisonerModal();
        });
    }

    // Add event listeners for pagination buttons
    setupPagination();
});

// Fetch all prisoners from the API
function fetchAllPrisoners() {
    // Show loading state
    const prisonerList = document.querySelector('.prisoner-list');
    if (prisonerList) {
        prisonerList.innerHTML = `
            <div class="loading-data">
                <i class="fas fa-spinner fa-spin"></i> Loading prisoners data...
            </div>
        `;
    }
    
    fetch('/api/prisoners/all')
        .then(response => response.json())
        .then(data => {
            allPrisoners = data;
            renderPrisonerCards(allPrisoners);
        })
        .catch(err => {
            console.error('Error fetching prisoners:', err);
            if (prisonerList) {
                prisonerList.innerHTML = `
                    <div class="error-data">
                        <i class="fas fa-exclamation-triangle"></i> Failed to load prisoners. Please try again later.
                    </div>
                `;
            }
        });
}

// Render prisoner cards with pagination
function renderPrisonerCards(prisoners, page = 1) {
    const prisonerList = document.querySelector('.prisoner-list');
    if (!prisonerList) return;
    
    if (prisoners.length === 0) {
        prisonerList.innerHTML = `
            <div class="empty-data">
                No prisoners found.
            </div>
        `;
        document.querySelector('.pagination').style.display = 'none';
        return;
    }
    
    // Pagination settings
    const prisonersPerPage = 6;
    const totalPages = Math.ceil(prisoners.length / prisonersPerPage);
    const startIdx = (page - 1) * prisonersPerPage;
    const endIdx = Math.min(startIdx + prisonersPerPage, prisoners.length);
    const visiblePrisoners = prisoners.slice(startIdx, endIdx);
    
    // Clear the prisoner list
    prisonerList.innerHTML = '';
    
    // Add prisoner cards
    visiblePrisoners.forEach(prisoner => {
        const prisonerCard = document.createElement('div');
        prisonerCard.className = 'prisoner-card';
        
        prisonerCard.innerHTML = `
            <div class="prisoner-details">
                <div class="prisoner-header">
                    <div>
                        <h3 class="prisoner-name">${prisoner.name}</h3>
                        <p class="prisoner-id">ID: ${prisoner.prisonerID}</p>
                    </div>
                    <div class="prisoner-status">Active</div>
                </div>
                <div class="prisoner-info">
                    <div class="prisoner-info-item">
                        <span class="info-label">Age</span>
                        <span class="info-value">${prisoner.age}</span>
                    </div>
                    <div class="prisoner-info-item">
                        <span class="info-label">Gender</span>
                        <span class="info-value">${prisoner.gender}</span>
                    </div>
                    <div class="prisoner-info-item">
                        <span class="info-label">Crime</span>
                        <span class="info-value">${prisoner.crime}</span>
                    </div>
                    <div class="prisoner-info-item">
                        <span class="info-label">Sentence</span>
                        <span class="info-value">${prisoner.total_sentence || 'N/A'}</span>
                    </div>
                </div>
                <div class="prisoner-actions">
                    <button class="view-btn" data-id="${prisoner.prisonerID}"><i class="fas fa-eye"></i> View</button>
                    <button class="edit-btn" data-id="${prisoner.prisonerID}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="delete-btn" data-id="${prisoner.prisonerID}"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `;
        
        prisonerList.appendChild(prisonerCard);
        
        // Add event listeners for buttons
        const viewBtn = prisonerCard.querySelector('.view-btn');
        viewBtn.addEventListener('click', function() {
            const prisonerId = this.getAttribute('data-id');
            viewPrisonerDetails(prisonerId);
        });
        
        const editBtn = prisonerCard.querySelector('.edit-btn');
        editBtn.addEventListener('click', function() {
            const prisonerId = this.getAttribute('data-id');
            editPrisoner(prisonerId);
        });
        
        const deleteBtn = prisonerCard.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            const prisonerId = this.getAttribute('data-id');
            confirmDeletePrisoner(prisonerId);
        });
    });
    
    // Update pagination
    updatePagination(page, totalPages);
}

// Update pagination UI
function updatePagination(currentPage, totalPages) {
    const pagination = document.querySelector('.pagination');
    if (!pagination) return;
    
    // Show pagination if there are multiple pages
    pagination.style.display = totalPages > 1 ? 'flex' : 'none';
    
    // Clear existing pagination buttons except first and last
    const existingPageButtons = pagination.querySelectorAll('button:not(:first-child):not(:last-child)');
    existingPageButtons.forEach(button => pagination.removeChild(button));
    
    // Add page buttons
    const prevBtn = pagination.querySelector('button:first-child');
    const nextBtn = pagination.querySelector('button:last-child');
    
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        if (i === currentPage) {
            pageBtn.classList.add('active');
        }
        
        // Insert before the next button
        pagination.insertBefore(pageBtn, nextBtn);
        
        pageBtn.addEventListener('click', function() {
            renderPrisonerCards(allPrisoners, i);
        });
    }
    
    // Update prev/next button states
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// Setup pagination event listeners
function setupPagination() {
    const pagination = document.querySelector('.pagination');
    if (!pagination) return;
    
    const prevBtn = pagination.querySelector('button:first-child');
    const nextBtn = pagination.querySelector('button:last-child');
    
    prevBtn.addEventListener('click', function() {
        const activePage = pagination.querySelector('button.active');
        if (activePage && activePage.previousElementSibling && activePage.previousElementSibling !== prevBtn) {
            activePage.previousElementSibling.click();
        }
    });
    
    nextBtn.addEventListener('click', function() {
        const activePage = pagination.querySelector('button.active');
        if (activePage && activePage.nextElementSibling && activePage.nextElementSibling !== nextBtn) {
            activePage.nextElementSibling.click();
        }
    });
}

// Filter prisoners by search term
function filterPrisoners(searchTerm) {
    if (!searchTerm) {
        // Clear search, apply other filters if any
        applyFilters();
        return;
    }
    
    const filteredPrisoners = allPrisoners.filter(prisoner => 
        prisoner.prisonerID.toLowerCase().includes(searchTerm) ||
        prisoner.name.toLowerCase().includes(searchTerm) ||
        prisoner.crime.toLowerCase().includes(searchTerm)
    );
    
    renderPrisonerCards(filteredPrisoners);
}

// Apply all filters
function applyFilters() {
    const prisonFilter = document.querySelector('.filter-group select:first-of-type').value;
    const crimeFilter = document.querySelector('.filter-group select:last-of-type').value;
    const searchTerm = document.querySelector('.prisoner-search input').value.toLowerCase();
    
    let filteredPrisoners = [...allPrisoners];
    
    // Apply search filter
    if (searchTerm) {
        filteredPrisoners = filteredPrisoners.filter(prisoner => 
            prisoner.prisonerID.toLowerCase().includes(searchTerm) ||
            prisoner.name.toLowerCase().includes(searchTerm) ||
            prisoner.crime.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply prison filter
    if (prisonFilter && prisonFilter !== 'all') {
        filteredPrisoners = filteredPrisoners.filter(prisoner => {
            // Assuming prisoner has jailID or similar property
            // You may need to adjust this based on your actual data structure
            return prisoner.jailID === prisonFilter;
        });
    }
    
    // Apply crime filter
    if (crimeFilter && crimeFilter !== 'all') {
        filteredPrisoners = filteredPrisoners.filter(prisoner => {
            const crime = prisoner.crime.toLowerCase();
            if (crimeFilter === 'felony') {
                return crime.includes('felony') || crime.includes('murder') || crime.includes('robbery');
            } else if (crimeFilter === 'misdemeanor') {
                return crime.includes('misdemeanor') || crime.includes('theft') || crime.includes('assault');
            } else if (crimeFilter === 'infraction') {
                return crime.includes('infraction') || crime.includes('trespass');
            }
            return true;
        });
    }
    
    renderPrisonerCards(filteredPrisoners);
}

// View prisoner details
function viewPrisonerDetails(prisonerId) {
    // Fetch detailed info if needed, or use existing data
    const prisoner = allPrisoners.find(p => p.prisonerID === prisonerId);
    if (!prisoner) return;
    
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
    }
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Format dates
    const formattedImprisonmentDate = new Date(prisoner.date_of_imprisonment).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    
    // Set modal content
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Prisoner Details</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="prisoner-detail-card">
                    <div class="prisoner-detail-header">
                        <h3>${prisoner.name}</h3>
                        <span class="prisoner-id">${prisoner.prisonerID}</span>
                    </div>
                    <div class="prisoner-detail-section">
                        <h4>Personal Information</h4>
                        <div class="detail-row">
                            <span class="detail-label">Age</span>
                            <span class="detail-value">${prisoner.age}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Gender</span>
                            <span class="detail-value">${prisoner.gender}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Cell ID</span>
                            <span class="detail-value">${prisoner.cellID || 'Not assigned'}</span>
                        </div>
                    </div>
                    <div class="prisoner-detail-section">
                        <h4>Case Information</h4>
                        <div class="detail-row">
                            <span class="detail-label">Crime</span>
                            <span class="detail-value">${prisoner.crime}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Date of Imprisonment</span>
                            <span class="detail-value">${formattedImprisonmentDate}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Sentence Duration</span>
                            <span class="detail-value">${prisoner.total_sentence || 'Not specified'}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn close-btn">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.appendChild(modalContainer);
    currentModal = modalContainer;
    
    // Add event listener for close buttons
    const closeButtons = modalContainer.querySelectorAll('.close-modal, .close-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            document.body.removeChild(modalContainer);
            currentModal = null;
        });
    });
}

// Show add prisoner modal
function showAddPrisonerModal() {
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
                <h2>Add New Prisoner</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="add-prisoner-form">
                    <div class="form-group">
                        <label for="prisoner-id">Prisoner ID</label>
                        <input type="text" id="prisoner-id" placeholder="Enter Prisoner ID (e.g., P001)" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-name">Full Name</label>
                        <input type="text" id="prisoner-name" placeholder="Enter Prisoner Name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-age">Age</label>
                        <input type="number" id="prisoner-age" placeholder="Enter Age" min="18" max="100" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-gender">Gender</label>
                        <select id="prisoner-gender" required>
                            <option value="">Select Gender</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-blood-group">Blood Group</label>
                        <select id="prisoner-blood-group" required>
                            <option value="">Select Blood Group</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-crime">Crime</label>
                        <select id="prisoner-crime" required>
                            <option value="">Select Crime</option>
                            <option value="Felony">Felony</option>
                            <option value="Misdemeanor">Misdemeanor</option>
                            <option value="Infraction">Infraction</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="imprisonment-date">Date of Imprisonment</label>
                        <input type="date" id="imprisonment-date" value="${formattedDate}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="sentence-duration">Sentence Duration</label>
                        <input type="number" id="sentence-duration" placeholder="Enter years">
                    </div>

                    <div class="form-group">
                        <label for="emergency-contact">Emergency Contact</label>
                        <input type="text" id="emergency-contact" placeholder="Emergency contact number" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="cell-id">Cell ID</label>
                        <select id="cell-id">
                            <option value="">Select Cell</option>
                            <!-- Will be populated via JavaScript -->
                        </select>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Add Prisoner</button>
                        <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.appendChild(modalContainer);
    currentModal = modalContainer;
    
    // Load available cells for dropdown
    loadAvailableCells();
    
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
    const form = modalContainer.querySelector('#add-prisoner-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        addNewPrisoner(form);
    });
}

// Load available cells for dropdown
function loadAvailableCells() {
    fetch('/api/cells/available')
        .then(response => response.json())
        .then(cells => {
            const cellSelect = document.getElementById('cell-id');
            if (cellSelect) {
                cells.forEach(cell => {
                    const option = document.createElement('option');
                    option.value = cell.cellID;
                    option.textContent = cell.cellID;
                    cellSelect.appendChild(option);
                });
            }
        })
        .catch(err => {
            console.error('Error loading available cells:', err);
        });
}

// Add new prisoner
function addNewPrisoner(form) {
    const prisonerId = form.querySelector('#prisoner-id').value;
    const name = form.querySelector('#prisoner-name').value;
    const ageValue = form.querySelector('#prisoner-age').value;
    const gender = form.querySelector('#prisoner-gender').value;
    const bloodGroup = form.querySelector('#prisoner-blood-group').value;
    const crime = form.querySelector('#prisoner-crime').value;
    const date_of_imprisonment = form.querySelector('#imprisonment-date').value;
    const total_sentence = form.querySelector('#sentence-duration').value;
    const emergencyContact = form.querySelector('#emergency-contact').value;
    const cellID = form.querySelector('#cell-id').value;
    
    // Parse age as integer
    const age = parseInt(ageValue, 10);
    
    // Validate input
    if (!prisonerId || !name || !ageValue || !gender || !bloodGroup || !crime || !date_of_imprisonment || !emergencyContact) {
        showNotification('All required fields must be filled', 'error');
        return;
    }
    
    // Validate age
    if (isNaN(age) || age < 18 || age > 100) {
        showNotification('Age must be a number between 18 and 100', 'error');
        return;
    }
    
    // Create prisoner object
    const newPrisoner = {
        prisonerID: prisonerId,
        name,
        age,
        gender,
        blood_group: bloodGroup,
        crime,
        date_of_imprisonment,
        total_sentence: total_sentence || null,
        emergency_contact: emergencyContact,
        cellID: cellID || null
    };
    
    // Send data to server
    fetch('/api/prisoners', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPrisoner)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Prisoner added successfully', 'success');
            if (currentModal) {
                document.body.removeChild(currentModal);
                currentModal = null;
            }
            // Refresh prisoner list
            fetchAllPrisoners();
        } else {
            showNotification(data.message || 'Error adding prisoner', 'error');
        }
    })
    .catch(err => {
        console.error('Error:', err);
        showNotification('An error occurred while adding the prisoner', 'error');
    });
}

// Make sure the event listener for the Add Prisoner button is properly attached
document.addEventListener('DOMContentLoaded', function() {
    // Existing event listeners...
    
    // Add event listener for add prisoner button
    const addBtn = document.querySelector('.prisoner-filters .btn');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            showAddPrisonerModal();
        });
    }
});
// Edit prisoner
function editPrisoner(prisonerId) {
    // Fetch prisoner details
    const prisoner = allPrisoners.find(p => p.prisonerID === prisonerId);
    if (!prisoner) return;
    
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
    }
    
    // Format date for the input field (YYYY-MM-DD)
    const imprisonmentDate = new Date(prisoner.date_of_imprisonment);
    const year = imprisonmentDate.getFullYear();
    const month = String(imprisonmentDate.getMonth() + 1).padStart(2, '0');
    const day = String(imprisonmentDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Set modal content
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Edit Prisoner</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="edit-prisoner-form">
                    <input type="hidden" id="prisoner-id" value="${prisoner.prisonerID}">
                    
                    <div class="form-group">
                        <label for="prisoner-name">Full Name</label>
                        <input type="text" id="prisoner-name" value="${prisoner.name}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-age">Age</label>
                        <input type="number" id="prisoner-age" value="${prisoner.age}" min="18" max="100" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-gender">Gender</label>
                        <select id="prisoner-gender" required>
                            <option value="M" ${prisoner.gender === 'M' ? 'selected' : ''}>Male</option>
                            <option value="F" ${prisoner.gender === 'F' ? 'selected' : ''}>Female</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-blood-group">Blood Group</label>
                        <select id="prisoner-blood-group" required>
                            <option value="O+" ${prisoner.blood_group === 'O+' ? 'selected' : ''}>O+</option>
                            <option value="O-" ${prisoner.blood_group === 'O-' ? 'selected' : ''}>O-</option>
                            <option value="A+" ${prisoner.blood_group === 'A+' ? 'selected' : ''}>A+</option>
                            <option value="A-" ${prisoner.blood_group === 'A-' ? 'selected' : ''}>A-</option>
                            <option value="B+" ${prisoner.blood_group === 'B+' ? 'selected' : ''}>B+</option>
                            <option value="B-" ${prisoner.blood_group === 'B-' ? 'selected' : ''}>B-</option>
                            <option value="AB+" ${prisoner.blood_group === 'AB+' ? 'selected' : ''}>AB+</option>
                            <option value="AB-" ${prisoner.blood_group === 'AB-' ? 'selected' : ''}>AB-</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-crime">Crime</label>
                        <select id="prisoner-crime" required>
                            <option value="Felony" ${prisoner.crime === 'Felony' ? 'selected' : ''}>Felony</option>
                            <option value="Misdemeanor" ${prisoner.crime === 'Misdemeanor' ? 'selected' : ''}>Misdemeanor</option>
                            <option value="Infraction" ${prisoner.crime === 'Infraction' ? 'selected' : ''}>Infraction</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="imprisonment-date">Date of Imprisonment</label>
                        <input type="date" id="imprisonment-date" value="${formattedDate}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="sentence-duration">Sentence Duration</label>
                        <input type="number" id="sentence-duration" value="${prisoner.total_sentence || ''}">
                    </div>

                    <div class="form-group">
                        <label for="emergency-contact">Emergency Contact</label>
                        <input type="text" id="emergency-contact" value="${prisoner.emergency_contact || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="cell-id">Cell ID</label>
                        <select id="cell-id">
                            <option value="">Select Cell</option>
                            <!-- Will be populated via JavaScript -->
                        </select>
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
    
    // Load available cells for dropdown, plus current cell
    loadAvailableCellsForEdit(prisoner.cellID);
    
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
    const form = modalContainer.querySelector('#edit-prisoner-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        updatePrisoner(form);
    });
}

// Load available cells for edit form
function loadAvailableCellsForEdit(currentCellId) {
    fetch('/api/cells/available')
        .then(response => response.json())
        .then(cells => {
            const cellSelect = document.getElementById('cell-id');
            if (cellSelect) {
                // If current cell exists, add it first
                if (currentCellId) {
                    const currentOption = document.createElement('option');
                    currentOption.value = currentCellId;
                    currentOption.textContent = `${currentCellId} (Current)`;
                    currentOption.selected = true;
                    cellSelect.appendChild(currentOption);
                }
                
                // Add available cells
                cells.forEach(cell => {
                    if (cell.cellID !== currentCellId) {
                        const option = document.createElement('option');
                        option.value = cell.cellID;
                        option.textContent = cell.cellID;
                        cellSelect.appendChild(option);
                    }
                });
            }
        })
        .catch(err => {
            console.error('Error loading available cells:', err);
        });
}

// Update prisoner
function updatePrisoner(form) {
    const prisonerId = form.querySelector('#prisoner-id').value;
    const name = form.querySelector('#prisoner-name').value;
    const age = form.querySelector('#prisoner-age').value;
    const gender = form.querySelector('#prisoner-gender').value;
    const bloodGroup = form.querySelector('#prisoner-blood-group').value;
    const crime = form.querySelector('#prisoner-crime').value;
    const date_of_imprisonment = form.querySelector('#imprisonment-date').value;
    const total_sentence = form.querySelector('#sentence-duration').value;
    const emergencyContact = form.querySelector('#emergency-contact').value;
    const cellID = form.querySelector('#cell-id').value;
    
    // Create updated prisoner object
    const updatedPrisoner = {
        name,
        age: parseInt(age),
        gender,
        blood_group: bloodGroup,
        crime,
        date_of_imprisonment,
        total_sentence: total_sentence || null,
        emergency_contact: emergencyContact,
        cellID: cellID || null
    };
    
    // Send data to server
    fetch(`/api/prisoners/${prisonerId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedPrisoner)
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
            showNotification('Prisoner updated successfully', 'success');
            
            // Refresh prisoners data
            fetchAllPrisoners();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to update prisoner', 'error');
        }
    })
    .catch(err => {
        console.error('Error updating prisoner:', err);
        showNotification('Failed to update prisoner. Please try again later.', 'error');
    });
}

// Confirm delete prisoner
function confirmDeletePrisoner(prisonerId) {
    if (confirm(`Are you sure you want to delete prisoner with ID ${prisonerId}? This action cannot be undone.`)) {
        deletePrisoner(prisonerId);
    }
}

// Delete prisoner
function deletePrisoner(prisonerId) {
    fetch(`/api/prisoners/${prisonerId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification('Prisoner deleted successfully', 'success');
            
            // Refresh prisoners data
            fetchAllPrisoners();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to delete prisoner', 'error');
        }
    })
    .catch(err => {
        console.error('Error deleting prisoner:', err);
        showNotification('Failed to delete prisoner. Please try again later.', 'error');
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