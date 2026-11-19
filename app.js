(() => {
    'use strict';


    /* ========================================
       1. CONFIGURACIÓN GENERAL
    ======================================== */

    const STORAGE_KEY = 'inventario-productos-v1';

    // Productos predeterminados
    const DEFAULT_PRODUCTS = [
        {
            id: 1,
            nombre: 'Lápiz',
            categoria: 'Papelería',
            descripcion: '',
            cantidad: 120
        },
        {
            id: 2,
            nombre: 'Cuaderno',
            categoria: 'Papelería',
            descripcion: '',
            cantidad: 50
        },
        {
            id: 3,
            nombre: 'Borrador',
            categoria: 'Papelería',
            descripcion: '',
            cantidad: 35
        },
        {
            id: 4,
            nombre: 'Regla',
            categoria: 'Papelería',
            descripcion: '',
            cantidad: 40
        }
    ];

    // Almacenamiento temporal en memoria
    let memoryProducts = null;


    /* ========================================
       2. LIMPIEZA Y VALIDACIÓN DE DATOS
    ======================================== */

    // Limpiar texto y limitar su longitud
    const cleanText = (value, maxLength) =>
        String(value ?? '').trim().slice(0, maxLength);

    // Validar y normalizar productos
    const normalizeProduct = (item) => {

        if (!item || typeof item !== 'object') {
            return null;
        }

        const id = Number(item.id);
        const cantidad = Number(item.cantidad);

        const nombre = cleanText(item.nombre, 100);
        const categoria = cleanText(item.categoria, 80);

        if (
            !Number.isSafeInteger(id) ||
            id < 1 ||
            !nombre ||
            !categoria ||
            !Number.isSafeInteger(cantidad) ||
            cantidad < 0
        ) {
            return null;
        }

        return {
            id,
            nombre,
            categoria,
            descripcion: cleanText(item.descripcion, 500),
            cantidad
        };
    };


    /* ========================================
       3. LECTURA DEL INVENTARIO
    ======================================== */

    function readProducts() {

        // Recuperar productos de la memoria temporal
        if (memoryProducts) {
            return memoryProducts.map((item) => ({ ...item }));
        }

        try {

            const raw = localStorage.getItem(STORAGE_KEY);

            // Si no existen datos, cargar productos predeterminados
            if (raw === null) {

                memoryProducts = DEFAULT_PRODUCTS.map((item) => ({ ...item }));

                writeProducts(memoryProducts);

                return memoryProducts.map((item) => ({ ...item }));
            }

            // Convertir los datos almacenados
            const parsed = JSON.parse(raw);

            if (!Array.isArray(parsed)) {
                throw new Error('El formato guardado no es válido.');
            }

            // Evitar productos inválidos e identificadores duplicados
            const seenIds = new Set();

            memoryProducts = parsed
                .map(normalizeProduct)
                .filter((item) => {

                    if (!item || seenIds.has(item.id)) {
                        return false;
                    }

                    seenIds.add(item.id);

                    return true;
                });

            return memoryProducts.map((item) => ({ ...item }));

        } catch (error) {

            // Recuperar productos predeterminados si ocurre un error
            memoryProducts = DEFAULT_PRODUCTS.map((item) => ({ ...item }));

            showNotice(
                'No se pudo leer el almacenamiento del navegador. Los cambios solo durarán mientras esta página permanezca abierta.',
                'warning'
            );

            return memoryProducts.map((item) => ({ ...item }));
        }
    }


    /* ========================================
       4. GUARDAR PRODUCTOS
    ======================================== */

    function writeProducts(products) {

        memoryProducts = products.map((item) => ({ ...item }));

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(memoryProducts)
            );

            return true;

        } catch (error) {

            showNotice(
                'El navegador bloqueó el guardado. Los cambios se conservarán solo durante esta sesión.',
                'warning'
            );

            return false;
        }
    }


    /* ========================================
       5. MENSAJES Y NOTIFICACIONES
    ======================================== */

    function showNotice(message, type = 'success') {

        const region = document.querySelector('[data-notice]');

        if (!region) {
            return;
        }

        region.textContent = message;
        region.className = `notice notice--${type}`;
        region.hidden = false;

        window.clearTimeout(showNotice.timer);

        showNotice.timer = window.setTimeout(() => {
            region.hidden = true;
        }, 5500);
    }


    /* ========================================
       6. FUNCIONES AUXILIARES
    ======================================== */

    // Proteger el contenido HTML
    function escapeHTML(value) {

        return String(value ?? '').replace(
            /[&<>"']/g,
            (character) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[character]
        );
    }

    // Generar el siguiente identificador
    function nextId(products) {

        return products.reduce(
            (highest, item) => Math.max(highest, item.id),
            0
        ) + 1;
    }


    /* ========================================
       7. REGISTRO Y EDICIÓN DE PRODUCTOS
    ======================================== */

    function initializeForm() {

        const form = document.querySelector('[data-product-form]');

        if (!form) {
            return;
        }

        // Detectar si se está editando un producto
        const params = new URLSearchParams(window.location.search);
        const editId = Number(params.get('editar'));

        const product =
            Number.isSafeInteger(editId) && editId > 0
                ? readProducts().find((item) => item.id === editId)
                : null;

        const title = document.querySelector('[data-form-title]');
        const submit = form.querySelector('[type="submit"]');
        const cancel = document.querySelector('[data-cancel-edit]');

        // Verificar si existe el producto solicitado
        if (params.has('editar') && !product) {

            showNotice(
                'No se encontró ese producto; puedes registrar uno nuevo.',
                'warning'
            );
        }

        // Cargar información del producto para editar
        if (product) {

            form.elements.nombre.value = product.nombre;
            form.elements.categoria.value = product.categoria;
            form.elements.descripcion.value = product.descripcion;
            form.elements.cantidad.value = String(product.cantidad);

            title.textContent = 'Modificar producto';
            submit.textContent = 'Guardar cambios';
            cancel.hidden = false;
        }

        // Evento para guardar el formulario
        form.addEventListener('submit', (event) => {

            event.preventDefault();

            if (!form.reportValidity()) {
                return;
            }

            // Obtener y limpiar los datos
            const values = {

                nombre: cleanText(form.elements.nombre.value, 100),

                categoria: cleanText(form.elements.categoria.value, 80),

                descripcion: cleanText(form.elements.descripcion.value, 500),

                cantidad: Number(form.elements.cantidad.value)
            };

            // Validar nombre y categoría
            if (!values.nombre || !values.categoria) {

                showNotice(
                    'El nombre y la categoría son obligatorios.',
                    'error'
                );

                return;
            }

            // Validar cantidad
            if (
                !Number.isSafeInteger(values.cantidad) ||
                values.cantidad < 0
            ) {

                showNotice(
                    'La cantidad debe ser un número entero igual o mayor que cero.',
                    'error'
                );

                return;
            }

            const products = readProducts();

            // Actualizar producto existente
            if (product) {

                const index = products.findIndex(
                    (item) => item.id === product.id
                );

                if (index < 0) {

                    showNotice(
                        'El producto ya no existe. Actualiza la lista e intenta de nuevo.',
                        'error'
                    );

                    return;
                }

                products[index] = {
                    ...products[index],
                    ...values
                };

                writeProducts(products);

                window.location.assign(
                    'productos.html?guardado=modificar'
                );

            } else {

                // Registrar un producto nuevo
                products.push({
                    id: nextId(products),
                    ...values
                });

                writeProducts(products);

                window.location.assign(
                    'productos.html?guardado=agregar'
                );
            }

        });
    }


    /* ========================================
       8. VISUALIZACIÓN Y BÚSQUEDA DE PRODUCTOS
    ======================================== */

    function initializeProductList() {

        const body = document.querySelector('[data-product-rows]');

        if (!body) {
            return;
        }

        const search = document.querySelector('[data-product-search]');
        const count = document.querySelector('[data-product-count]');
        const empty = document.querySelector('[data-empty-state]');

        // Mostrar productos en la tabla
        const render = () => {

            const query = cleanText(search?.value, 100)
                .toLocaleLowerCase('es');

            // Filtrar productos según la búsqueda
            const products = readProducts().filter((item) =>

                `${item.nombre} ${item.categoria} ${item.descripcion} ${item.id}`
                    .toLocaleLowerCase('es')
                    .includes(query)
            );

            // Generar filas de la tabla
            body.innerHTML = products.map((item) => `

                <tr>

                    <td data-label="ID">
                        ${item.id}
                    </td>

                    <td data-label="Producto">

                        <strong>
                            ${escapeHTML(item.nombre)}
                        </strong>

                        ${item.descripcion
                            ? `<small class="description-cell">${escapeHTML(item.descripcion)}</small>`
                            : ''
                        }

                    </td>

                    <td data-label="Categoría">
                        ${escapeHTML(item.categoria)}
                    </td>

                    <td data-label="Existencia">

                        <span class="stock-badge">
                            ${item.cantidad}
                        </span>

                    </td>

                    <td data-label="Acciones" class="actions-cell">

                        <a
                            class="button button--small button--edit"
                            href="agregar.html?editar=${item.id}"
                            aria-label="Modificar ${escapeHTML(item.nombre)}">
                            Modificar
                        </a>

                        <button
                            class="button button--small button--delete"
                            type="button"
                            data-delete-id="${item.id}"
                            aria-label="Eliminar ${escapeHTML(item.nombre)}">
                            Eliminar
                        </button>

                    </td>

                </tr>

            `).join('');

            // Actualizar contador de productos
            if (count) {

                count.textContent = `${products.length} ${
                    products.length === 1 ? 'producto' : 'productos'
                }`;
            }

            // Mostrar mensaje cuando no hay resultados
            if (empty) {
                empty.hidden = products.length > 0;
            }

            body.closest('table').hidden = products.length === 0;
        };


        /* ========================================
           9. ELIMINAR PRODUCTOS
        ======================================== */

        body.addEventListener('click', (event) => {

            const button = event.target.closest('[data-delete-id]');

            if (!button) {
                return;
            }

            const id = Number(button.dataset.deleteId);

            const product = readProducts().find(
                (item) => item.id === id
            );

            if (!product) {

                showNotice(
                    'El producto ya fue eliminado o no existe.',
                    'warning'
                );

                render();

                return;
            }

            // Confirmar eliminación
            if (
                !window.confirm(
                    `¿Eliminar “${product.nombre}” del inventario? Esta acción no se puede deshacer.`
                )
            ) {
                return;
            }

            // Eliminar producto
            writeProducts(
                readProducts().filter((item) => item.id !== id)
            );

            showNotice(
                `“${product.nombre}” se eliminó correctamente.`,
                'success'
            );

            render();
        });

        // Activar búsqueda en tiempo real
        search?.addEventListener('input', render);

        // Mostrar inventario inicial
        render();


        /* ========================================
           10. MENSAJES DE CONFIRMACIÓN
        ======================================== */

        const result = new URLSearchParams(
            window.location.search
        ).get('guardado');

        if (result === 'agregar') {

            showNotice(
                'Producto guardado correctamente.',
                'success'
            );
        }

        if (result === 'modificar') {

            showNotice(
                'Cambios guardados correctamente.',
                'success'
            );
        }

    }


    /* ========================================
       11. EXPORTACIÓN A CSV
    ======================================== */

    function exportCSV(products) {

        const headers = [
            'ID',
            'Producto',
            'Categoría',
            'Descripción',
            'Existencia'
        ];

        // Preparar celdas del archivo
        const cell = (value) =>
            `"${String(value ?? '').replace(/"/g, '""')}"`;

        const rows = [
            headers,
            ...products.map((item) => [
                item.id,
                item.nombre,
                item.categoria,
                item.descripcion,
                item.cantidad
            ])
        ];

        // Crear contenido CSV
        const content = '\uFEFF' +
            rows.map((row) => row.map(cell).join(';')).join('\r\n');

        downloadFile(
            new Blob([content], {
                type: 'text/csv;charset=utf-8'
            }),
            'reporte-inventario.csv'
        );
    }


    /* ========================================
       12. DESCARGA DE ARCHIVOS
    ======================================== */

    function downloadFile(blob, filename) {

        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');

        link.href = url;
        link.download = filename;

        document.body.append(link);

        link.click();

        link.remove();

        window.setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
    }


    /* ========================================
       13. EXPORTACIÓN A EXCEL
    ======================================== */

    function initializeExport() {

        const button = document.querySelector('[data-export-excel]');

        if (!button) {
            return;
        }

        button.addEventListener('click', () => {

            const products = readProducts();

            // Verificar que existan productos
            if (!products.length) {

                showNotice(
                    'No hay productos para incluir en el reporte.',
                    'warning'
                );

                return;
            }

            try {

                // Comprobar disponibilidad de la librería XLSX
                if (window.XLSX) {

                    const rows = products.map(({
                        id,
                        nombre,
                        categoria,
                        descripcion,
                        cantidad
                    }) => ({

                        ID: id,
                        Producto: nombre,
                        Categoría: categoria,
                        Descripción: descripcion,
                        Existencia: cantidad

                    }));

                    // Crear hoja de cálculo
                    const sheet = window.XLSX.utils.json_to_sheet(rows);

                    // Ajustar ancho de columnas
                    sheet['!cols'] = [
                        { wch: 10 },
                        { wch: 28 },
                        { wch: 22 },
                        { wch: 42 },
                        { wch: 14 }
                    ];

                    // Crear libro de Excel
                    const workbook = window.XLSX.utils.book_new();

                    window.XLSX.utils.book_append_sheet(
                        workbook,
                        sheet,
                        'Inventario'
                    );

                    // Descargar archivo Excel
                    window.XLSX.writeFile(
                        workbook,
                        'reporte-inventario.xlsx'
                    );

                    showNotice(
                        'Reporte Excel descargado correctamente.',
                        'success'
                    );

                } else {

                    // Alternativa si XLSX no está disponible
                    exportCSV(products);

                    showNotice(
                        'Se descargó un archivo CSV compatible con Excel; la librería XLSX no está disponible.',
                        'warning'
                    );
                }

            } catch (error) {

                // Si falla Excel, descargar CSV
                exportCSV(products);

                showNotice(
                    'No se pudo crear el archivo XLSX; se descargó un CSV compatible con Excel.',
                    'warning'
                );
            }

        });
    }


    /* ========================================
       14. ESTADÍSTICAS DE LA PÁGINA DE INICIO
    ======================================== */

    function initializeHomeStats() {

        const total = document.querySelector('[data-home-total]');

        if (!total) {
            return;
        }

        const products = readProducts();

        // Total de productos registrados
        total.textContent = String(products.length);

        // Total de unidades existentes
        const units = document.querySelector('[data-home-units]');

        if (units) {

            units.textContent = String(
                products.reduce(
                    (sum, item) => sum + item.cantidad,
                    0
                )
            );
        }
    }


    /* ========================================
       15. INICIALIZACIÓN DEL SISTEMA
    ======================================== */

    document.addEventListener('DOMContentLoaded', () => {

        // Inicializar formulario
        initializeForm();

        // Inicializar lista de productos
        initializeProductList();

        // Inicializar exportación
        initializeExport();

        // Inicializar estadísticas
        initializeHomeStats();

    });

})();