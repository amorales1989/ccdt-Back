const { supabase } = require('../config/supabase');

const toursController = {
  // GET /api/tours -> { success, data: ["tour_key", ...] }
  list: async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

      const { data, error } = await supabase
        .from('profiles')
        .select('completed_tours')
        .eq('id', userId)
        .single();

      if (error) throw error;
      res.json({ success: true, data: data?.completed_tours || [] });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/tours/complete  { tour_key }
  complete: async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

      const { tour_key } = req.body || {};
      if (!tour_key || typeof tour_key !== 'string') {
        return res.status(400).json({ success: false, message: 'tour_key requerido' });
      }

      const { data: current, error: fetchError } = await supabase
        .from('profiles')
        .select('completed_tours')
        .eq('id', userId)
        .single();
      if (fetchError) throw fetchError;

      const existing = current?.completed_tours || [];
      if (existing.includes(tour_key)) {
        return res.json({ success: true, data: existing });
      }

      const updated = [...existing, tour_key];
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ completed_tours: updated })
        .eq('id', userId);
      if (updateError) throw updateError;

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/tours/:tour_key -> resetea un tour (para testing/ayuda)
  reset: async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

      const { tour_key } = req.params;

      const { data: current, error: fetchError } = await supabase
        .from('profiles')
        .select('completed_tours')
        .eq('id', userId)
        .single();
      if (fetchError) throw fetchError;

      const updated = (current?.completed_tours || []).filter((k) => k !== tour_key);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ completed_tours: updated })
        .eq('id', userId);
      if (updateError) throw updateError;

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = toursController;
