export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TransactionTag {
  transactionId: string;
  tagId: string;
}
