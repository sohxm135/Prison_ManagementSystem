// main.js - Main JavaScript file for the prison management system

document.addEventListener('DOMContentLoaded', function() {
    // Sidebar toggle functionality
    console.log("Loaded");
    const toggleSidebar = document.querySelector('.toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            mainContent.classList.toggle('full-width');
        });
    }

    // Dropdown functionality
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', function() {
            this.querySelector('.dropdown-content').classList.toggle('show');
        });
    });

    // Close dropdowns when clicking outside
    window.addEventListener('click', function(event) {
        if (!event.target.matches('.dropdown')) {
            const dropdowns = document.getElementsByClassName("dropdown-content");
            for (let i = 0; i < dropdowns.length; i++) {
                let openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
        }
    });

    // Tab functionality (for profile page and others)
    const tabButtons = document.querySelectorAll('.profile-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Jail selection functionality
    const jailCards = document.querySelectorAll('.jail-card');
    jailCards.forEach(card => {
        card.addEventListener('click', () => {
            jailCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            // Here you would typically load the selected jail's information
            // For demo purposes, we'll just log the selected jail
            console.log('Selected jail:', card.querySelector('.jail-name').textContent);
        });
    });

    // Search functionality
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
        input.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const searchableItems = document.querySelectorAll('.searchable-item');
            
            searchableItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // Form submission handling
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            // Here you would typically send the form data to the server
            // For demo purposes, we'll just log the form data
            const formData = new FormData(this);
            console.log('Form submitted:', Object.fromEntries(formData));
            alert('Form submitted successfully!');
        });
    });

    // Pagination functionality
    const paginationButtons = document.querySelectorAll('.pagination button');
    paginationButtons.forEach(button => {
        button.addEventListener('click', function() {
            paginationButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            // Here you would typically load the corresponding page data
            // For demo purposes, we'll just log the page number
            console.log('Page selected:', this.textContent);
        });
    });

    // Date formatting helper function
    function formatDate(date) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(date).toLocaleDateString(undefined, options);
    }

    // Update current date in the dashboard
    const currentDateElement = document.querySelector('.current-date');
    if (currentDateElement) {
        currentDateElement.textContent = formatDate(new Date());
    }

    
});


