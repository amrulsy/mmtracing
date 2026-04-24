import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth';
import prisma from '../../config/database';

const router = Router();

// Endpoint for GET /api/v1/:entity/export
router.get('/:entity/export', authMiddleware, requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityKey = String(req.params.entity);
    
    // Map standard entity names to prisma models
    const entityMap: Record<string, string> = {
      'pelanggan': 'pelanggan',
      'kendaraan': 'kendaraan',
      'spk': 'spk',
      'pembayaran': 'pembayaran',
      'sparepart': 'sparepart',
      'mekanik': 'mekanik',
      'inventaris': 'inventarisLog',
      'log-aktivitas': 'activityLog',
      'users': 'user'
    };

    const modelName = entityMap[entityKey];
    if (!modelName || !(prisma as any)[modelName]) {
      res.status(404).json({ success: false, message: 'Entity not found or export not supported' });
      return;
    }

    const data = await (prisma as any)[modelName].findMany();
    
    if (data.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.attachment(`${entityKey}.csv`);
      res.send('');
      return;
    }

    // Convert JSON to CSV using a simple strategy
    const headers = Object.keys(data[0]);
    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvRows = [];
    csvRows.push(headers.join(',')); // Add Header
    
    for (const row of data) {
      const values = headers.map(header => escapeCsv(row[header]));
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.attachment(`${entityKey}.csv`);
    res.send(csvString);
  } catch (e) {
    next(e);
  }
});

export default router;
