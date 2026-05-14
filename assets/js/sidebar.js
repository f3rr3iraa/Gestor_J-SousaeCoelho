document.addEventListener('DOMContentLoaded', function() {
    const accordions = ['collapseChapas', 'collapseCatalogo', 'collapseOrcamento', 'collapseClientes'];
    
    // Restaurar estado guardado
    accordions.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const isOpen = localStorage.getItem(id) === 'true';
            if (isOpen) {
                element.classList.add('show');
                const button = element.previousElementSibling.querySelector('button');
                if (button) {
                    button.classList.remove('collapsed');
                }
            }
            
            // Listener para guardar quando muda
            element.addEventListener('shown.bs.collapse', function() {
                localStorage.setItem(id, 'true');
            });
            
            element.addEventListener('hidden.bs.collapse', function() {
                localStorage.setItem(id, 'false');
            });
        }
    });
});
