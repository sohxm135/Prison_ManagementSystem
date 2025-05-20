// Global variables
let allBooks = [];
let currentModal = null;
let filterStatus = '';
let filterGenre = '';

// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function() {
    // Fetch books data
    fetchAllBooks();
    
    // Add event listener for sidebar toggle
    const toggleBtn = document.querySelector('.toggle-sidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    }
    
    // Add event listener for search
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterBooks(this.value);
        });
    }
    
    // Add event listener for status filter
    const statusFilter = document.querySelector('.filter-group select:first-of-type');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            filterStatus = this.value;
        });
    }
    
    // Add event listener for genre filter
    const genreFilter = document.querySelector('.filter-group select:last-of-type');
    if (genreFilter) {
        genreFilter.addEventListener('change', function() {
            filterGenre = this.value;
        });
    }
    
    // Add event listener for filter button
    const filterBtn = document.querySelector('.filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            applyFilters();
        });
    }
    
    // Add event listener for add book button
    const addBookBtn = document.querySelector('.add-new');
    if (addBookBtn) {
        addBookBtn.addEventListener('click', function() {
            showAddBookModal();
        });
    }
});

// Fetch all books
function fetchAllBooks() {
    // Show loading state
    const tableBody = document.querySelector('.data-table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i> Loading books...
                    </div>
                </td>
            </tr>
        `;
    }
    
    fetch('/api/library/books')
        .then(response => response.json())
        .then(data => {
            allBooks = data;
            renderBookTable(allBooks);
        })
        .catch(err => {
            console.error('Error fetching books:', err);
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center">
                            <div class="error">
                                Failed to load books. Please try again.
                            </div>
                        </td>
                    </tr>
                `;
            }
        });
}

// Render book table
function renderBookTable(books) {
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody) return;
    
    // Clear the table
    tableBody.innerHTML = '';
    
    if (books.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    No books found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Add rows for each book
    books.forEach(book => {
        let issuedTo = '-';
        let issueDate = '-';
        let returnDate = '-';
        let status = 'available';
        let statusClass = 'available';
        
        // If book has issue records
        if (book.issue_details) {
            issuedTo = book.issue_details.prisonerID || '-';
            issueDate = book.issue_details.issue_date ? formatDate(new Date(book.issue_details.issue_date)) : '-';
            returnDate = book.issue_details.return_date ? formatDate(new Date(book.issue_details.return_date)) : '-';
            
            if (book.availability_status === 'Issued') {
                status = 'issued';
                statusClass = 'issued';
            } else if (book.issue_details.return_date) {
                status = 'returned';
                statusClass = 'returned';
            }
        }
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${book.bookID}</td>
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td>${book.genre || '-'}</td>
            <td>${issuedTo}</td>
            <td>${issueDate}</td>
            <td>${returnDate}</td>
            <td><span class="status ${statusClass}">${book.availability_status}</span></td>
            <td class="actions">
                ${book.availability_status === 'Available' ? 
                    `<button class="action-btn issue" data-id="${book.bookID}"><i class="fas fa-book"></i></button>` : 
                    book.availability_status === 'Issued' ? 
                    `<button class="action-btn return" data-id="${book.bookID}"><i class="fas fa-undo"></i></button>` : ''}
                <button class="action-btn edit" data-id="${book.bookID}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" data-id="${book.bookID}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Add event listeners for buttons
        const issueBtn = row.querySelector('.issue');
        if (issueBtn) {
            issueBtn.addEventListener('click', function() {
                const bookId = this.getAttribute('data-id');
                showIssueBookModal(bookId);
            });
        }
        
        const returnBtn = row.querySelector('.return');
        if (returnBtn) {
            returnBtn.addEventListener('click', function() {
                const bookId = this.getAttribute('data-id');
                returnBook(bookId);
            });
        }
        
        const editBtn = row.querySelector('.edit');
        if (editBtn) {
            editBtn.addEventListener('click', function() {
                const bookId = this.getAttribute('data-id');
                editBook(bookId);
            });
        }
        
        const deleteBtn = row.querySelector('.delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                const bookId = this.getAttribute('data-id');
                confirmDeleteBook(bookId);
            });
        }
    });
}

// Format date
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Filter books by search term
function filterBooks(searchTerm) {
    if (!searchTerm) {
        renderBookTable(allBooks);
        return;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filteredBooks = allBooks.filter(book => 
        book.bookID.toLowerCase().includes(lowerSearchTerm) ||
        book.title.toLowerCase().includes(lowerSearchTerm) ||
        book.author.toLowerCase().includes(lowerSearchTerm) ||
        (book.genre && book.genre.toLowerCase().includes(lowerSearchTerm))
    );
    
    renderBookTable(filteredBooks);
}

// Apply filters (status and genre)
function applyFilters() {
    let filteredBooks = [...allBooks];
    
    // Apply status filter
    if (filterStatus) {
        filteredBooks = filteredBooks.filter(book => {
            if (filterStatus === 'available') {
                return book.availability_status === 'Available';
            } else if (filterStatus === 'issued') {
                return book.availability_status === 'Issued';
            } else if (filterStatus === 'returned') {
                return book.issue_details && book.issue_details.return_date;
            }
            return true;
        });
    }
    
    // Apply genre filter
    if (filterGenre) {
        filteredBooks = filteredBooks.filter(book => {
            return book.genre && book.genre.toLowerCase() === filterGenre.toLowerCase();
        });
    }
    
    renderBookTable(filteredBooks);
}

// Show add book modal
function showAddBookModal() {
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
        currentModal = null;
    }
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Create modal content
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Add New Book</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="add-book-form">
                    <div class="form-group">
                        <label for="book-id">Book ID</label>
                        <input type="text" id="book-id" placeholder="Enter Book ID (e.g., B001)" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="book-title">Title</label>
                        <input type="text" id="book-title" placeholder="Enter Book Title" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="book-author">Author</label>
                        <input type="text" id="book-author" placeholder="Enter Author Name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="book-genre">Genre</label>
                        <select id="book-genre">
                            <option value="">Select Genre</option>
                            <option value="Fiction">Fiction</option>
                            <option value="Non-Fiction">Non-Fiction</option>
                            <option value="History">History</option>
                            <option value="Self-Help">Self-Help</option>
                            <option value="Educational">Educational</option>
                            <option value="Adventure">Adventure</option>
                            <option value="Legal">Legal</option>
                        </select>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Add Book</button>
                        <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.appendChild(modalContainer);
    currentModal = modalContainer;
    
    // Add event listeners for modal
    modalContainer.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    modalContainer.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    // Add event listener for form submission
    const form = modalContainer.querySelector('#add-book-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        addBook(this);
    });
}

// Add new book
function addBook(form) {
    const bookID = form.querySelector('#book-id').value;
    const title = form.querySelector('#book-title').value;
    const author = form.querySelector('#book-author').value;
    const genre = form.querySelector('#book-genre').value || null;
    
    const newBook = {
        bookID,
        title,
        author,
        genre
    };
    
    fetch('/api/library/books', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newBook)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (currentModal) {
                document.body.removeChild(currentModal);
                currentModal = null;
            }
            
            // Show success message
            showNotification('Book added successfully', 'success');
            
            // Refresh books list
            fetchAllBooks();
        } else {
            showNotification(data.message || 'Failed to add book', 'error');
        }
    })
    .catch(err => {
        console.error('Error adding book:', err);
        showNotification('An error occurred while adding the book', 'error');
    });
}

// Edit book
function editBook(bookID) {
    // Find book in allBooks array
    const book = allBooks.find(b => b.bookID === bookID);
    if (!book) return;
    
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
        currentModal = null;
    }
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Create modal content
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Edit Book</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="edit-book-form">
                    <div class="form-group">
                        <label for="book-id">Book ID</label>
                        <input type="text" id="book-id" value="${book.bookID}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label for="book-title">Title</label>
                        <input type="text" id="book-title" value="${book.title}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="book-author">Author</label>
                        <input type="text" id="book-author" value="${book.author}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="book-genre">Genre</label>
                        <select id="book-genre">
                            <option value="">Select Genre</option>
                            <option value="Fiction" ${book.genre === 'Fiction' ? 'selected' : ''}>Fiction</option>
                            <option value="Non-Fiction" ${book.genre === 'Non-Fiction' ? 'selected' : ''}>Non-Fiction</option>
                            <option value="History" ${book.genre === 'History' ? 'selected' : ''}>History</option>
                            <option value="Self-Help" ${book.genre === 'Self-Help' ? 'selected' : ''}>Self-Help</option>
                            <option value="Educational" ${book.genre === 'Educational' ? 'selected' : ''}>Educational</option>
                            <option value="Adventure" ${book.genre === 'Adventure' ? 'selected' : ''}>Adventure</option>
                            <option value="Legal" ${book.genre === 'Legal' ? 'selected' : ''}>Legal</option>
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
    
    // Add event listeners for modal
    modalContainer.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    modalContainer.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    // Add event listener for form submission
    const form = modalContainer.querySelector('#edit-book-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        updateBook(this, bookID);
    });
}

// Update book
function updateBook(form, bookID) {
    const title = form.querySelector('#book-title').value;
    const author = form.querySelector('#book-author').value;
    const genre = form.querySelector('#book-genre').value || null;
    
    const updatedBook = {
        title,
        author,
        genre
    };
    
    fetch(`/api/library/books/${bookID}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedBook)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (currentModal) {
                document.body.removeChild(currentModal);
                currentModal = null;
            }
            
            // Show success message
            showNotification('Book updated successfully', 'success');
            
            // Refresh books list
            fetchAllBooks();
        } else {
            showNotification(data.message || 'Failed to update book', 'error');
        }
    })
    .catch(err => {
        console.error('Error updating book:', err);
        showNotification('An error occurred while updating the book', 'error');
    });
}

// Confirm delete book
function confirmDeleteBook(bookID) {
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
        currentModal = null;
    }
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Create modal content
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Delete Book</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete this book? This action cannot be undone.</p>
                
                <div class="form-actions">
                    <button class="btn btn-danger delete-confirm-btn">Delete</button>
                    <button class="btn btn-secondary cancel-btn">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.appendChild(modalContainer);
    currentModal = modalContainer;
    
    // Add event listeners for modal
    modalContainer.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    modalContainer.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    // Add event listener for delete confirmation
    modalContainer.querySelector('.delete-confirm-btn').addEventListener('click', () => {
        deleteBook(bookID);
    });
}

// Delete book
function deleteBook(bookID) {
    fetch(`/api/library/books/${bookID}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        // Close modal
        if (currentModal) {
            document.body.removeChild(currentModal);
            currentModal = null;
        }
        
        if (data.success) {
            // Show success message
            showNotification('Book deleted successfully', 'success');
            
            // Refresh books list
            fetchAllBooks();
        } else {
            showNotification(data.message || 'Failed to delete book', 'error');
        }
    })
    .catch(err => {
        console.error('Error deleting book:', err);
        showNotification('An error occurred while deleting the book', 'error');
        
        // Close modal
        if (currentModal) {
            document.body.removeChild(currentModal);
            currentModal = null;
        }
    });
}

// Show issue book modal
function showIssueBookModal(bookID) {
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
        currentModal = null;
    }
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Create modal content
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Issue Book</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="issue-book-form">
                    <input type="hidden" id="book-id" value="${bookID}">
                    
                    <div class="form-group">
                        <label for="prisoner-id">Select Prisoner</label>
                        <select id="prisoner-id" required>
                            <option value="">Select Prisoner</option>
                            <!-- Will be populated from API -->
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="issue-date">Issue Date</label>
                        <input type="date" id="issue-date" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Issue Book</button>
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
    loadPrisoners();
    
    // Add event listeners for modal
    modalContainer.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    modalContainer.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    // Add event listener for form submission
    const form = modalContainer.querySelector('#issue-book-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        issueBook(this);
    });
}

// Load prisoners for dropdown
function loadPrisoners() {
    fetch('/api/prisoners')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('prisoner-id');
            data.forEach(prisoner => {
                const option = document.createElement('option');
                option.value = prisoner.prisonerID;
                option.textContent = `${prisoner.name} (${prisoner.prisonerID})`;
                select.appendChild(option);
            });
        })
        .catch(err => {
            console.error('Error loading prisoners:', err);
        });
}

// Issue book
function issueBook(form) {
    const bookID = form.querySelector('#book-id').value;
    const prisonerID = form.querySelector('#prisoner-id').value;
    const issue_date = form.querySelector('#issue-date').value;
    
    const issueData = {
        bookID,
        prisonerID,
        issue_date
    };
    
    fetch('/api/library/books/issue', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(issueData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (currentModal) {
                document.body.removeChild(currentModal);
                currentModal = null;
            }
            
            // Show success message
            showNotification('Book issued successfully', 'success');
            
            // Refresh books list
            fetchAllBooks();
        } else {
            showNotification(data.message || 'Failed to issue book', 'error');
        }
    })
    .catch(err => {
        console.error('Error issuing book:', err);
        showNotification('An error occurred while issuing the book', 'error');
    });
}

// Return book
function returnBook(bookID) {
    const today = new Date().toISOString().split('T')[0];
    
    fetch('/api/library/books/return', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            bookID,
            return_date: today
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            showNotification('Book returned successfully', 'success');
            
            // Refresh books list
            fetchAllBooks();
        } else {
            showNotification(data.message || 'Failed to return book', 'error');
        }
    })
    .catch(err => {
        console.error('Error returning book:', err);
        showNotification('An error occurred while returning the book', 'error');
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notification-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        </span>
        <span class="notification-message">${message}</span>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Add event listener for close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        document.body.removeChild(notification);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 5000);
}