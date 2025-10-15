import express from 'express';

const router = express.Router();

// Получение списка всех дивизионов
router.get('/', (req, res) => {
  try {
    const divisions = [
      { 
        name: 'Herald', 
        maxMMR: 1000, 
        minMatches: 100,
        color: 'bg-red-500',
        description: 'Геральд (0-1000 MMR)',
        requirements: 'Минимум 100 матчей'
      },
      { 
        name: 'Guardian', 
        maxMMR: 2000, 
        minMatches: 150,
        color: 'bg-orange-500',
        description: 'Страж (1000-2000 MMR)',
        requirements: 'Минимум 150 матчей'
      },
      { 
        name: 'Knight', 
        maxMMR: 3000, 
        minMatches: 200,
        color: 'bg-yellow-500',
        description: 'Рыцарь (2000-3000 MMR)',
        requirements: 'Минимум 200 матчей'
      },
      { 
        name: 'Hero', 
        maxMMR: 4000, 
        minMatches: 300,
        color: 'bg-green-500',
        description: 'Герой (3000-4000 MMR)',
        requirements: 'Минимум 300 матчей'
      }
    ];
    
    res.json(divisions);
  } catch (error) {
    console.error('Error fetching divisions:', error);
    res.status(500).json({ error: 'Failed to fetch divisions' });
  }
});

export default router;