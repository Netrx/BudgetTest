// ===== МОДАЛЬНОЕ ОКНО =====
export function openModal(title, content, onSubmit) {
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease;
    `;
    
    modal.innerHTML = `
        <div class="modal" style="
            background: var(--color-bg-card);
            border-radius: var(--radius);
            padding: 24px;
            max-width: 480px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            border: 1px solid var(--color-border);
            box-shadow: var(--shadow-lg);
        ">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h2 style="font-size:18px;font-weight:600;color:var(--color-text);">${title}</h2>
                <button class="modal-close" style="
                    font-size:18px;
                    background:none;
                    border:none;
                    cursor:pointer;
                    color:var(--color-text-secondary);
                    transition:0.2s;
                    padding:4px 8px;
                    border-radius:var(--radius-sm);
                ">✕</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeModal = () => {
        const errorEl = modal.querySelector('.modal-error');
        if (errorEl) errorEl.remove();
        modal.remove();
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    if (onSubmit) {
        const form = modal.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                
                const errorEl = modal.querySelector('.modal-error');
                if (errorEl) errorEl.remove();
                
                try {
                    onSubmit(data);
                    closeModal();
                } catch (error) {
                    console.error('Ошибка при сохранении:', error);
                    
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'modal-error';
                    errorDiv.style.cssText = `
                        color: #EF4444;
                        font-size: 12px;
                        margin-top: 12px;
                        padding: 8px 12px;
                        background: rgba(239, 68, 68, 0.1);
                        border-radius: var(--radius-sm);
                        border: 1px solid rgba(239, 68, 68, 0.2);
                    `;
                    errorDiv.textContent = 'Ошибка при сохранении. Проверьте введенные данные.';
                    
                    const body = modal.querySelector('.modal-body');
                    if (body) {
                        body.appendChild(errorDiv);
                    }
                }
            });
        }
    }
    
    return modal;
}