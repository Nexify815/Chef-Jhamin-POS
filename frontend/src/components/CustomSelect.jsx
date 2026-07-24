import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function CustomSelect({ value, onChange, options, className = '', placeholder = 'Select...', required = false, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const ref = useRef(null);
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const normalized = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  const matched = normalized.find(o => String(o.value) === String(value));

  useEffect(() => {
    if (value !== '' && value !== undefined && value !== null && !normalized.find(o => String(o.value) === String(value))) {
      setIsCustom(true);
      setCustomValue(String(value));
    } else {
      setIsCustom(false);
      setCustomValue('');
    }
  }, [value, options]);

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen]);

  const updateDropdownPos = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPos();
    const onScroll = () => updateDropdownPos();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [isOpen]);

  const handleSelect = (opt) => {
    setIsCustom(false);
    setCustomValue('');
    onChange(String(opt.value));
    setIsOpen(false);
  };

  const handleCustomChange = (e) => {
    setCustomValue(e.target.value);
    onChange(e.target.value);
  };

  const handleCustomBlur = () => {
    if (!customValue.trim()) {
      setIsCustom(false);
      onChange('');
    }
  };

  if (isCustom) {
    return (
      <div className={`flex gap-2 ${className}`}>
        <input
          type="text"
          value={customValue}
          onChange={handleCustomChange}
          onBlur={handleCustomBlur}
          placeholder="Type custom value..."
          className="input-field text-sm flex-1"
          autoFocus
        />
        <button
          type="button"
          onClick={() => { setIsCustom(false); setCustomValue(''); onChange(''); }}
          className="custom-select-cancel"
        >
          <i className="fas fa-times" />
        </button>
      </div>
    );
  }

  const dropdown = isOpen ? createPortal(
    <div
      ref={dropdownRef}
      className="custom-select-dropdown"
      style={{
        position: 'absolute',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        minWidth: 0,
        right: 'auto',
        zIndex: 9999,
      }}
    >
      {normalized.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => handleSelect(opt)}
          className={`custom-select-option ${String(value) === String(opt.value) ? 'active' : ''}`}
        >
          {opt.label}
        </button>
      ))}
      <div className="custom-select-divider" />
      <button
        type="button"
        onClick={() => { setIsCustom(true); setIsOpen(false); setCustomValue(''); onChange(''); }}
        className="custom-select-option custom-option"
      >
        <i className="fas fa-keyboard mr-2" style={{ fontSize: '11px', opacity: 0.5 }} />
        Custom...
      </button>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={ref} className={`custom-select ${className}`} style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="custom-select-trigger"
        style={{ borderColor: isOpen ? 'var(--teal)' : undefined }}
      >
        <span style={{ color: matched ? 'var(--text-primary)' : 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {matched ? matched.label : placeholder}
        </span>
        <i className="fas fa-chevron-down" style={{ fontSize: '10px', color: 'var(--text-dim)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', flexShrink: 0 }} />
      </button>

      {dropdown}
    </div>
  );
}
