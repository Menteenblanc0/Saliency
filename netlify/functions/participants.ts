import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { normalizeEmail, reconcileOrder } from './utils/participants-utils';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, participantId } = body;
    const email = body.email ? normalizeEmail(body.email) : undefined;

    if (action === 'register') {
      if (!email) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Email requerido' }) };
      }

      const { data: activeImages } = await supabase.from('images').select('id').eq('is_active', true);
      const activeIds = (activeImages || []).map((img) => img.id);

      const { data: existing } = await supabase
        .from('participants')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      let participant = existing;

      if (!participant) {
        const shuffledOrder = reconcileOrder([], activeIds);
        const { data: created, error } = await supabase
          .from('participants')
          .insert([{ email, image_order: shuffledOrder, last_seen_at: new Date().toISOString() }])
          .select()
          .single();

        if (error) throw error;
        participant = created;
      } else {
        const updatedOrder = reconcileOrder(participant.image_order || [], activeIds);
        const { data: updated } = await supabase
          .from('participants')
          .update({ image_order: updatedOrder, last_seen_at: new Date().toISOString() })
          .eq('id', participant.id)
          .select()
          .single();

        participant = updated;
      }

      const { data: done } = await supabase
        .from('annotations')
        .select('image_id')
        .eq('participant_id', participant.id);

      const doneImageIds = (done || []).map((d) => d.image_id);

      return {
        statusCode: 200,
        body: JSON.stringify({
          participantId: participant.id,
          imageOrder: participant.image_order,
          doneImageIds,
        }),
      };
    }

    if (action === 'complete') {
      if (!participantId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'participantId requerido' }) };
      }

      const { data: activeImages } = await supabase.from('images').select('id').eq('is_active', true);
      const activeIds = (activeImages || []).map((img) => img.id);

      const { data: doneAnnotations } = await supabase
        .from('annotations')
        .select('image_id')
        .eq('participant_id', participantId);

      const completedIds = new Set((doneAnnotations || []).map((a) => a.image_id));
      const pendingImageIds = activeIds.filter((id) => !completedIds.has(id));

      if (pendingImageIds.length > 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'No se han completado todas las imágenes requeridas',
            pendingImageIds,
          }),
        };
      }

      await supabase
        .from('participants')
        .update({ completed_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
        .eq('id', participantId);

      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Acción no válida' }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
