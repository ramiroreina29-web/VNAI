
import { supabase } from './supabaseClient';
import { VisualNovelData, SavedProject } from '../types';

export const saveProject = async (vnData: VisualNovelData): Promise<void> => {
  try {
    // Check if project exists
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('id', vnData.id)
      .single();

    if (existing) {
      // Update
      const { error } = await supabase
        .from('projects')
        .update({
          title: vnData.title,
          genre: vnData.genre,
          summary: vnData.summary,
          updated_at: new Date().toISOString(),
          game_data: vnData
        })
        .eq('id', vnData.id);
      
      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase
        .from('projects')
        .insert({
          id: vnData.id,
          title: vnData.title,
          genre: vnData.genre,
          summary: vnData.summary,
          game_data: vnData
        });

      if (error) throw error;
    }
  } catch (e) {
    console.error("Error saving to Supabase:", e);
    throw e;
  }
};

export const getProjects = async (): Promise<SavedProject[]> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      genre: row.genre,
      createdAt: new Date(row.created_at).getTime(),
      data: row.game_data
    }));
  } catch (e) {
    console.error("Error fetching projects from Supabase:", e);
    return [];
  }
};

export const deleteProject = async (id: string): Promise<void> => {
  try {
    console.log(`Iniciando eliminación completa del proyecto ${id}...`);

    // 1. ELIMINAR ASSETS (IMÁGENES) DEL STORAGE
    // Listar archivos en la carpeta del proyecto
    const { data: files, error: listError } = await supabase.storage
      .from('Novelanime')
      .list(id);

    if (listError) {
      console.warn("No se pudieron listar los archivos para borrar (quizás ya está vacío):", listError.message);
    } else if (files && files.length > 0) {
      // Construir rutas: projectId/filename
      const filesToRemove = files.map(f => `${id}/${f.name}`);
      
      console.log(`Eliminando ${filesToRemove.length} archivos de assets...`);
      
      const { error: removeError } = await supabase.storage
        .from('Novelanime')
        .remove(filesToRemove);
        
      if (removeError) {
        console.error("Error al borrar archivos del storage:", removeError.message);
        // Continuamos de todas formas para borrar la DB y no dejar el proyecto "zombie"
      } else {
        console.log("Assets eliminados correctamente.");
      }
    }

    // 2. ELIMINAR REGISTRO DE LA BASE DE DATOS
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    console.log("Registro de base de datos eliminado.");

  } catch (e) {
    console.error("Error crítico eliminando proyecto:", e);
    throw e;
  }
};
