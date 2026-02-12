import ReactDOM from 'react-dom';

const PrintPortal = ({ children }) => {
    const printRoot = document.getElementById('print-mount');
    if (!printRoot) return null;
    return ReactDOM.createPortal(children, printRoot);
};

export default PrintPortal;
