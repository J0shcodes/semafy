import { z } from 'zod';
import { isAddress } from 'viem';

export const evmAddressSchema = z.string().refine((val) => isAddress(val), {
  message: 'Invalid EVM address',
});
