
import React, { useState } from 'react';

interface AddClientFormProps {
  onClose: () => void;
  onAddClient: (name: string, uasg: string) => void;
}

export const AddClientForm: React.FC<AddClientFormProps> = ({ onClose, onAddClient }) => {
    const [name, setName] = useState('');
    const [uasg, setUasg] = useState('');
    const [errors, setErrors] = useState<{name?: string, uasg?: string}>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: {name?: string, uasg?: string} = {};
        if (!name.trim()) {
            newErrors.name = 'O nome do cliente é obrigatório.';
        }
        if (!uasg.trim()) {
            newErrors.uasg = 'O nº da UASG é obrigatório.'
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        onAddClient(name.trim(), uasg.trim());
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleSubmit} noValidate>
                    <div className="p-6 space-y-4">
                        <h2 className="text-xl font-bold text-white">Adicionar Novo Cliente</h2>
                        <div>
                            <label htmlFor="clientName" className="block text-sm font-medium text-gray-300">Nome do Cliente</label>
                            <input
                                type="text"
                                id="clientName"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setErrors(p => ({...p, name: undefined}))}}
                                className={`mt-1 block w-full px-3 py-2 bg-gray-700 border ${errors.name ? 'border-red-500' : 'border-gray-600'} rounded-md text-sm shadow-sm text-white placeholder-gray-400 focus:outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600`}
                                autoFocus
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label htmlFor="uasg" className="block text-sm font-medium text-gray-300">Nº da UASG</label>
                            <input
                                type="text"
                                id="uasg"
                                value={uasg}
                                onChange={(e) => { setUasg(e.target.value); setErrors(p => ({...p, uasg: undefined})) }}
                                className={`mt-1 block w-full px-3 py-2 bg-gray-700 border ${errors.uasg ? 'border-red-500' : 'border-gray-600'} rounded-md text-sm shadow-sm text-white placeholder-gray-400 focus:outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600`}
                            />
                            {errors.uasg && <p className="text-red-500 text-xs mt-1">{errors.uasg}</p>}
                        </div>
                    </div>
                    <div className="bg-gray-900 px-6 py-3 flex justify-end space-x-3 rounded-b-lg">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600">
                            Cancelar
                        </button>
                        <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700">
                            Salvar Cliente
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};