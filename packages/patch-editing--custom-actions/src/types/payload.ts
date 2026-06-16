import { ObjectType } from 'wme-sdk-typings';

export interface CustomActionPayload {
  actionName?: string;
  description: string;
  affectedObjects: {
    objectType: ObjectType;
    objectId: number | string;
  }[];
  do: () => void;
  undo?: () => void;
  redo?: () => void;
}
