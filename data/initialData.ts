
import type { Client } from '../types';

export const initialClientsData: Client[] = [
  {
    id: 1,
    name: 'EEAR - Escola de Especialistas de Aeronáutica',
    uasg: '120053',
    cnpj: '00.394.429/0079-99',
    address: 'Av. Brigadeiro Adhemar Lyrio, s/n - Pedregulho, Guaratinguetá - SP',
    contracts: [
      {
        id: 101,
        biddingId: '90001/2023',
        creationDate: '2023-11-15',
        cnpj: '00.394.429/0079-99',
        items: [
          { id: 1, item: 6, description: "PLACA HOMENAGEM, MATERIAL PLACA AÇO ESCOVADO...", unitValue: 63.00, quantityBid: 60 },
          { id: 2, item: 12, description: "TROFÉU PERSONALIZADO, ALTURA 30CM...", unitValue: 85.50, quantityBid: 25 },
        ],
        commitments: [
          { id: 1, commitmentNumber: '2023NE001', date: '2023-11-20', items: [{ contractItemId: 1, quantity: 40 }, { contractItemId: 2, quantity: 20 }] }
        ],
        invoices: [
          { id: 1, invoiceNumber: 'NF001', date: '2023-12-05', items: [{ contractItemId: 1, quantitySupplied: 19 }], isPaid: true },
          { id: 2, invoiceNumber: 'NF002', date: '2023-12-10', items: [{ contractItemId: 2, quantitySupplied: 10 }], isPaid: false }
        ]
      },
    ],
  },
  {
    id: 2,
    name: 'Prefeitura Municipal de Guaratinguetá',
    uasg: '985449',
    cnpj: '46.634.331/0001-20',
    address: 'R. Prof. Sylvio Jose Marcondes Coelho, 300 - Jardim Esperança, Guaratinguetá - SP',
    contracts: [
      {
        id: 201,
        biddingId: '12054/2024',
        creationDate: '2024-05-20',
        cnpj: '46.634.331/0001-20',
        items: [
           { id: 3, item: 21, description: "MEDALHA DE HONRA AO MÉRITO, DIÂMETRO 5CM...", unitValue: 25.00, quantityBid: 150 },
        ],
        commitments: [
          { id: 2, commitmentNumber: '2024NE987', date: '2024-05-25', items: [{ contractItemId: 3, quantity: 100 }] }
        ],
        invoices: [
          { id: 3, invoiceNumber: 'NF1050', date: '2024-06-10', items: [{ contractItemId: 3, quantitySupplied: 75 }], isPaid: false }
        ]
      }
    ]
  },
  {
    id: 3,
    name: 'Testes & Inovações',
    uasg: '999999',
    cnpj: '99.999.999/0001-99',
    address: 'Rua das Inovações, 123 - Bairro Beta, Cidade Exemplo - TS',
    contracts: [
      {
        id: 301,
        biddingId: 'TESTE-2024',
        creationDate: '2024-07-01',
        cnpj: '99.999.999/0001-99',
        items: [
          { id: 4, item: 1, description: "Item de Teste A - Canetas Esferográficas", unitValue: 2.50, quantityBid: 500 },
          { id: 5, item: 2, description: "Item de Teste B - Blocos de Anotações", unitValue: 5.00, quantityBid: 200 },
        ],
        commitments: [
          { id: 3, commitmentNumber: '2024NE-TESTE1', date: '2024-07-05', items: [{ contractItemId: 4, quantity: 300 }] },
          { id: 4, commitmentNumber: '2024NE-TESTE2', date: '2024-07-10', items: [{ contractItemId: 5, quantity: 100 }] }
        ],
        invoices: [
          { id: 4, invoiceNumber: 'NF-TESTE-001', date: '2024-07-15', items: [{ contractItemId: 4, quantitySupplied: 150 }], isPaid: false },
          { id: 5, invoiceNumber: 'NF-TESTE-002', date: '2024-07-20', items: [{ contractItemId: 5, quantitySupplied: 50 }], isPaid: true }
        ]
      },
       {
        id: 302,
        biddingId: 'TESTE-2025',
        creationDate: '2025-01-10',
        cnpj: '99.999.999/0001-99',
        items: [
          { id: 6, item: 10, description: "Item Vazio para Testes Futuros", unitValue: 100.00, quantityBid: 10 },
        ],
        commitments: [],
        invoices: []
      }
    ],
  }
];