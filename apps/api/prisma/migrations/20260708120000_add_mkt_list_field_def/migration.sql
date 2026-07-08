-- Add MKT_LIST to FieldType enum (must commit before INSERT can use it)
ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'MKT_LIST';
