// ==UserScript==
// @name         Web Highlighter
// @namespace    physicslog.com.web-highlighter
// @version      1.0
// @description  Highlight selected text, saves locally, and edit or delete highlights
// @match        *://*.wikipedia.org/*
// @grant        none
// @noframes
// ==/UserScript==

// @bug: Does not show up after refresh if the highlighted text contains <a>, <b>, <i> and so on tags
// @bug: Only work for Wikipedia

(function() {
    'use strict';

    const colors = ['#E5AE26', '#B895FF', '#54D171', '#D02848']; 
    const colors_title = ['Introduction', 'Important', 'Answer', 'Question'];
    let selectedColor = colors[0];

    // Color selection UI
    const colorPicker = document.createElement('div');
    colorPicker.style.position = 'fixed';
    colorPicker.style.top = '10px';
    colorPicker.style.right = '10px';
    colorPicker.style.zIndex = '1000';
    colors.forEach(color => {
        const colorButton = document.createElement('button');
        colorButton.style.backgroundColor = color;
        colorButton.style.width = '20px';
        colorButton.style.height = '20px';
        colorButton.style.margin = '2px';
        colorButton.style.borderRadius = '50%';
        colorButton.style.border = 'none';
        colorButton.style.cursor = 'pointer';
        colorButton.onclick = () => selectedColor = color;
        colorPicker.appendChild(colorButton);
    });
    // document.body.appendChild(colorPicker);

    // Load highlights from local storage
    const highlights = JSON.parse(localStorage.getItem('highlights') || '[]');
    console.log("Loaded highlights:", highlights);
    highlights.forEach(hl => {
        if (hl.url === window.location.href) {
            console.log("Restoring highlight:", hl);
            restoreHighlight(hl);
        }
    });

    // Save highlights to local storage
    function saveHighlights() {
        const serialized = Array.from(document.querySelectorAll('.highlighted')).map(el => ({
            text: el.innerText,
            color: el.style.backgroundColor,
            parentPath: getElementXPath(el.parentElement),
            url: window.location.href,
            timestamp: new Date().toISOString()
        }));
        console.log("Saving highlights to local storage:", serialized);
        localStorage.setItem('highlights', JSON.stringify(serialized));
    }

    // Restore a highlight
    function restoreHighlight({ text, color, parentPath }) {
        const parentElement = getElementByXPath(parentPath);
        if (parentElement) {
            const nodes = Array.from(parentElement.childNodes);
            nodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && node.nodeValue.includes(text)) {
                    const range = document.createRange();
                    range.setStart(node, node.nodeValue.indexOf(text));
                    range.setEnd(node, node.nodeValue.indexOf(text) + text.length);
                    wrapHighlight(range, color);
                    console.log("Highlight restored for text:", text);
                }
            });
        } else {
            console.error("Parent element not found for XPath:", parentPath);
        }
    }

    // Highlight selected text
    function wrapHighlight(range, color) {
        const span = document.createElement('span');
        span.style.backgroundColor = color;
        span.classList.add('highlighted');
        range.surroundContents(span);
    }

    // Get an XPath to an element
    function getElementXPath(element) {
        const paths = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let sibling = element.previousSibling;
            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            const tagName = element.nodeName.toLowerCase();
            const pathIndex = index ? `[${index + 1}]` : '';
            paths.unshift(`${tagName}${pathIndex}`);
            element = element.parentNode;
        }
        return paths.length ? `/${paths.join('/')}` : null;
    }

    // Retrieve an element by its XPath
    function getElementByXPath(xpath) {
        try {
            return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        } catch (e) {
            console.error("Error evaluating XPath:", xpath, e);
            return null;
        }
    }

    // Event listener for text selection and highlighting
    document.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const selectedText = selection.toString().trim();
            if (selectedText.length > 0) {
                wrapHighlight(range, selectedColor);
                saveHighlights();
                selection.removeAllRanges();
            }
        }
    });

    // Event listener for clicking on existing highlights
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('highlighted')) {
            createPopup(event.target);
        }
    });

    // Create a popup for editing or deleting highlights
    function createPopup(element) {
        const popup = document.createElement('div');
        popup.style.position = 'absolute';
        popup.style.background = 'rgba(255, 255, 255, 0.9)';
        popup.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        popup.style.border = '1px solid #ccc';
        popup.style.borderRadius = '8px';
        popup.style.padding = '5px';
        popup.style.zIndex = '1001';
        popup.style.transition = 'all 0.3s ease';

        // Color selection buttons to popup
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        colors.forEach((color, index) => {
            const colorButton = document.createElement('button');
            colorButton.style.backgroundColor = color;
            colorButton.style.width = '20px';
            colorButton.style.height = '20px';
            colorButton.style.margin = '2px';
            colorButton.style.borderRadius = '50%';
            colorButton.style.border = 'none';
            colorButton.style.cursor = 'pointer';
            colorButton.title = colors_title[index];
            colorButton.onclick = () => {
                element.style.backgroundColor = color;
                saveHighlights();
            };
            buttonContainer.appendChild(colorButton);
        });

        // Add "X" button to popup
        const closeButton = document.createElement('button');
        closeButton.title = 'Delete';
        closeButton.innerText = '\u00D7';
        closeButton.style.width = '20px';
        closeButton.style.height = '20px';
        closeButton.style.margin = '2px';
        closeButton.style.lineHeight = '15px';
        closeButton.style.textAlign = 'center';
        closeButton.style.border = 'none';
        closeButton.style.backgroundColor = 'gray';
        closeButton.style.color = 'white';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.borderRadius = '50%';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => {
            const parent = element.parentNode;
            parent.replaceChild(document.createTextNode(element.innerText), element);
            saveHighlights();
            document.body.removeChild(popup);
        };

        buttonContainer.appendChild(closeButton);
        popup.appendChild(buttonContainer);
        document.body.appendChild(popup);

        // Position the popup near the element
        const rect = element.getBoundingClientRect();
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.bottom + window.scrollY + 10}px`;

        // Remove popup when clicking outside
        document.addEventListener('click', (event) => {
            if (!popup.contains(event.target)) {
                document.body.removeChild(popup);
            }
        }, { once: true });
    }

})();